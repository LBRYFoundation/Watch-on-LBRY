// This should only work in background

let db: IDBDatabase | null = null

if (typeof chrome.extension === 'undefined') throw new Error("YT urlCache can only be accessed from extension windows and service-workers.")

if (typeof self.indexedDB !== 'undefined') {
    const openRequest = indexedDB.open("yt-url-resolver-cache")
    openRequest.addEventListener('upgradeneeded', () => openRequest.result.createObjectStore("store").createIndex("expireAt", "expireAt"))

    // Delete Expired
    openRequest.addEventListener('success', () => {
        db = openRequest.result
        clearExpired()
    })
}
else console.warn(`IndexedDB not supported`)

async function clearExpired() {
    return new Promise<void>((resolve, reject) => {
        if (!db) throw new Error(`IDBDatabase not defined.`)
        const transaction = db.transaction("store", "readwrite")
        const range = IDBKeyRange.upperBound(new Date())

        const expireAtCursorRequest = transaction.objectStore("store").index("expireAt").openCursor(range)
        expireAtCursorRequest.addEventListener('error', () => reject(expireAtCursorRequest.error))
        expireAtCursorRequest.addEventListener('success', () => {
            try {
                const expireCursor = expireAtCursorRequest.result
                if (!expireCursor) return
                expireCursor.delete()
                expireCursor.continue()
                resolve()
            }
            catch (ex) {
                reject(ex)
            }
        })
    })
}

async function clearAll() {
    return await new Promise<void>((resolve, reject) => {
        const store = db?.transaction("store", "readwrite").objectStore("store")
        if (!store) return resolve()
        const request = store.clear()
        request.addEventListener('success', () => resolve())
        request.addEventListener('error', () => reject(request.error))
    })
}

async function put(url: string | null, id: string): Promise<void> {
    return await new Promise((resolve, reject) => {
        const store = db?.transaction("store", "readwrite").objectStore("store")
        if (!store) return resolve()
        const expireAt = !url ? new Date(Date.now() + 1 * 60 * 60 * 1000) : new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
        const request = store.put({ value: url, expireAt }, id)
        console.log('caching', id, url, 'until:', expireAt)
        request.addEventListener('success', () => resolve())
        request.addEventListener('error', () => reject(request.error))
    })
}

// string means there is cache of lbrypathname
// null means there is cache of that id has no lbrypathname
// undefined means there is no cache
async function get(id: string): Promise<string | null | undefined> {
    const response = (await new Promise((resolve, reject) => {
        const store = db?.transaction("store", "readonly").objectStore("store")
        if (!store) return reject(`Can't find object store.`)

        const request = store.get(id)
        request.addEventListener('success', () => resolve(request.result))
        request.addEventListener('error', () => reject(request.error))
    }) as { value: string | null, expireAt: Date } | undefined)

    if (response === undefined) return undefined
    if (response.expireAt <= new Date()) {
        await clearExpired()
        return undefined
    }
    console.log('cache found', id, response.value)
    return response.value
}

export const lbryUrlCache = { put, get, clearAll }

