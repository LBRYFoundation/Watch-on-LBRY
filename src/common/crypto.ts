import { getExtensionSettingsAsync, ytUrlResolversSettings } from "./settings"
import { setSetting } from "./useSettings"
import path from 'path'

async function generateKeys() {
    const keys = await window.crypto.subtle.generateKey(
        {
            name: "RSASSA-PKCS1-v1_5",
            // Consider using a 4096-bit key for systems that require long-term security
            modulusLength: 384,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: "SHA-1",
        },
        true,
        ["sign", "verify"]
    )

    return {
        publicKey: await exportPublicKey(keys.publicKey),
        privateKey: await exportPrivateKey(keys.privateKey)
    }
}

async function exportPrivateKey(key: CryptoKey) {
    const exported = await window.crypto.subtle.exportKey(
        "pkcs8",
        key
    )
    return Buffer.from(exported).toString('base64')
}

const publicKeyPrefix = `MEwwDQYJKoZIhvcNAQEBBQADOwAwOAIxA`
const publicKeySuffix = `IDAQAB` //`wIDAQAB` `WIDAQAB`
const publicKeyLength = 65
async function exportPublicKey(key: CryptoKey) {
    const exported = await window.crypto.subtle.exportKey(
        "spki",
        key
    )
    const publicKey = Buffer.from(exported).toString('base64')
    console.log(publicKey)
    return publicKey.substring(publicKeyPrefix.length, publicKeyPrefix.length + publicKeyLength)
}

function importPrivateKey(base64: string) {
    return window.crypto.subtle.importKey(
        "pkcs8",
        Buffer.from(base64, 'base64'),
        {
            name: "RSASSA-PKCS1-v1_5",
            hash: "SHA-1",
        },
        true,
        ["sign"]
    )
}

export async function sign(data: string, privateKey: string) {
    return Buffer.from(await window.crypto.subtle.sign(
        { name: "RSASSA-PKCS1-v1_5" },
        await importPrivateKey(privateKey),
        await crypto.subtle.digest({ name: 'SHA-1' }, Buffer.from(data))
    )).toString('base64')
}

export function resetProfileSettings() {
    setSetting('publicKey', null)
    setSetting('privateKey', null)
}

async function apiRequest<T extends object>(method: 'GET' | 'POST', pathname: string, data: T) {
    const settings = await getExtensionSettingsAsync()
    /* const urlResolverSettings = ytUrlResolversSettings[settings.urlResolver]
    if (!urlResolverSettings.signRequest) throw new Error() */

    console.log(ytUrlResolversSettings)
    const url = new URL(ytUrlResolversSettings.madiatorFinder.href/* urlResolverSettings.href */)
    console.log(url)
    url.pathname = path.join(url.pathname, pathname)
    url.searchParams.set('data', JSON.stringify(data))

    if (true/* requiresSignature */) {
        if (!settings.privateKey || !settings.publicKey)
            throw new Error('There is no profile.')

        url.searchParams.set('keys', JSON.stringify({
            signature: await sign(url.searchParams.toString(), settings.privateKey!),
            publicKey: settings.publicKey
        }))
    }

    const respond = await fetch(url.href, { method })

    if (respond.ok) return respond.json()
    throw new Error((await respond.json()).message)
}

export async function generateProfileAndSetNickname(overwrite = false) {
    let { publicKey, privateKey } = await getExtensionSettingsAsync()

    let nickname
    while (true) {
        nickname = prompt("Pick a nickname")
        if (nickname) break
        if (nickname === null) return
        alert("Invalid nickname")
    }

    try {
        if (overwrite || !privateKey || !publicKey) {
            resetProfileSettings()
            await generateKeys().then((keys) => {
                publicKey = keys.publicKey
                privateKey = keys.privateKey
            })
            setSetting('publicKey', publicKey)
            setSetting('privateKey', privateKey)
        }
        await apiRequest('POST', '/profile', { nickname })
        alert(`Your nickname has been set to ${nickname}`)
    } catch (error: any) {
        resetProfileSettings()
        alert(error.message)
    }
}

export async function purgeProfile() {
    try {
        if (!confirm("This will purge all of your online and offline profile data.\nStill wanna continue?")) return
        await apiRequest('POST', '/profile/purge', {})
        resetProfileSettings()
        alert(`Your profile has been purged`)
    } catch (error: any) {
        alert(error.message)
    }
}

export async function getProfile() {
    let { publicKey, privateKey } = await getExtensionSettingsAsync()
    return (await apiRequest('GET', '/profile', { publicKey })) as { nickname: string, score: number, publickKey: string }
}

export function friendlyPublicKey(publicKey: string | null) {
    // This is copy paste of Madiator Finder's friendly public key
    return `${publicKey?.substring(0, 32)}...`
}

function download(data: string, filename: string, type: string) {
    const file = new Blob([data], { type: type })
    const a = document.createElement("a")
    const url = URL.createObjectURL(file)
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    setTimeout(() => {
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
    })
}

async function readFile() {
    return await new Promise<string | null>((resolve) => {
        const input = document.createElement("input")
        input.type = 'file'
        input.accept = '.wol-keys.json'

        input.click()
        input.addEventListener("change", () => {
            if (!input.files?.[0]) return
            const myFile = input.files[0]
            const reader = new FileReader()

            reader.addEventListener('load', () => resolve(reader.result?.toString() ?? null))
            reader.readAsText(myFile)
        })
    })
}

interface ExportedProfileKeysFile {
    publicKey: string
    privateKey: string
}

export async function exportProfileKeysAsFile() {
    const { publicKey, privateKey } = await getExtensionSettingsAsync()

    const json = JSON.stringify({
        publicKey,
        privateKey
    })

    download(json, `watch-on-lbry-profile-export-${friendlyPublicKey(publicKey)}.wol-keys.json`, 'application/json')
}

export async function importProfileKeysFromFile() {
    try {
        const json = await readFile()
        if (!json) throw new Error("Invalid")
        const { publicKey, privateKey } = JSON.parse(json) as ExportedProfileKeysFile
        setSetting('publicKey', publicKey)
        setSetting('privateKey', privateKey)
    } catch (error: any) {
        alert(error.message)
    }
}