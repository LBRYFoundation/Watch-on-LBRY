// This should only work in background

let db: IDBDatabase | null = null

if (typeof self.indexedDB !== 'undefined') {
    const openRequest = indexedDB.open("yt-url-resolver-cache")
    openRequest.addEventListener('upgradeneeded', () => openRequest.result.createObjectStore("store").createIndex("expireAt", "expireAt"))

    // Delete Expired
    openRequest.addEventListener('success', () => {
        db = openRequest.result
        const transaction = db.transaction("store", "readwrite")
        const range = IDBKeyRange.upperBound(new Date())

        const expireAtCursorRequest = transaction.objectStore("store").index("expireAt").openCursor(range)
        expireAtCursorRequest.addEventListener('success', () => {
            const expireCursor = expireAtCursorRequest.result
            if (!expireCursor) return
            expireCursor.delete()
            expireCursor.continue()
        })
    })
}
else console.warn(`IndexedDB not supported`)


async function put(url: string | null, id: string): Promise<void> {
    return await new Promise((resolve, reject) => {
        const store = db?.transaction("store", "readwrite").objectStore("store")
        if (!store) return resolve()
        const request = store.put({ value: url, expireAt: new Date(Date.now() + 24 * 60 * 60 * 1000) }, id)
        request.addEventListener('success', () => resolve())
        request.addEventListener('error', () => reject(request.error))
    })
}

async function get(id: string): Promise<string | null> {
    return (await new Promise((resolve, reject) => {
        const store = db?.transaction("store", "readonly").objectStore("store")
        if (!store) return resolve(null)
        const request = store.get(id)
        request.addEventListener('success', () => resolve(request.result))
        request.addEventListener('error', () => reject(request.error))
    }) as any)?.value
}

export const LbryPathnameCache = { put, get }

