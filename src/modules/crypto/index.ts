import path from 'path'
import type { DialogManager } from '../../components/dialogs'
import { getExtensionSettingsAsync, setExtensionSetting, ytUrlResolversSettings } from "../../settings"
import { getFileContent } from '../file'

async function generateKeys() {
    const keys = await crypto.subtle.generateKey(
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
    const exported = await crypto.subtle.exportKey(
        "pkcs8",
        key
    )
    return Buffer.from(exported).toString('base64')
}

const publicKeyPrefix = `MEwwDQYJKoZIhvcNAQEBBQADOwAwOAIxA`
const publicKeySuffix = `IDAQAB` //`wIDAQAB` `WIDAQAB`
const publicKeyLength = 65
async function exportPublicKey(key: CryptoKey) {
    const exported = await crypto.subtle.exportKey(
        "spki",
        key
    )
    const publicKey = Buffer.from(exported).toString('base64')
    return publicKey.substring(publicKeyPrefix.length, publicKeyPrefix.length + publicKeyLength)
}

function importPrivateKey(base64: string) {
    return crypto.subtle.importKey(
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
    return Buffer.from(await crypto.subtle.sign(
        { name: "RSASSA-PKCS1-v1_5" },
        await importPrivateKey(privateKey),
        await crypto.subtle.digest({ name: 'SHA-1' }, Buffer.from(data))
    )).toString('base64')
}

export function resetProfileSettings() {
    setExtensionSetting('publicKey', null)
    setExtensionSetting('privateKey', null)
}

async function apiRequest<T extends object>(method: 'GET' | 'POST', pathname: string, data: T) {
    const settings = await getExtensionSettingsAsync()
    /* const urlResolverSettings = ytUrlResolversSettings[settings.urlResolver]
    if (!urlResolverSettings.signRequest) throw new Error() */

    const url = new URL(ytUrlResolversSettings.madiatorFinder.href/* urlResolverSettings.href */)
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

export async function generateProfileAndSetNickname(dialogManager: DialogManager, overwrite = false) {
    let { publicKey, privateKey } = await getExtensionSettingsAsync()

    let nickname
    while (true) {
        nickname = await dialogManager.prompt("Pick a nickname")
        if (nickname) break
        if (nickname === null) return
        await dialogManager.alert("Invalid nickname")
    }

    try {
        if (overwrite || !privateKey || !publicKey) {
            resetProfileSettings()
            await generateKeys().then((keys) => {
                publicKey = keys.publicKey
                privateKey = keys.privateKey
            })
            setExtensionSetting('publicKey', publicKey)
            setExtensionSetting('privateKey', privateKey)
        }
        await apiRequest('POST', '/profile', { nickname })
        await dialogManager.alert(`Your nickname has been set to ${nickname}`)
    } catch (error: any) {
        resetProfileSettings()
        await dialogManager.alert(error.message)
    }
}

export async function purgeProfile(dialogManager: DialogManager) {
    try {
        if (!await dialogManager.confirm("This will purge all of your online and offline profile data.\nStill wanna continue?")) return
        await apiRequest('POST', '/profile/purge', {})
        resetProfileSettings()
        await dialogManager.alert(`Your profile has been purged`)
    } catch (error: any) {
        await dialogManager.alert(error.message)
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

// Using callback here because there is no good solution for detecting cancel event
export function inputKeyFile(callback: (file: File | null) => void) {
    const input = document.createElement("input")
    input.type = 'file'
    input.accept = '.wol-keys.json'
    input.click()
    input.addEventListener("change", () => callback(input.files?.[0] ?? null))
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

export async function importProfileKeysFromFile(dialogManager: DialogManager, file: File) {
    try {
        let settings = await getExtensionSettingsAsync()
        if (settings.publicKey && !await dialogManager.confirm(
            "This will overwrite your old keypair." +
            "\nStill wanna continue?\n\n" +
            "NOTE: Without keypair you can't purge your data online.\n" +
            "So if you wish to purge, please use purging instead."
        )) return false
        const json = await getFileContent(file)
        if (!json) return false
        const { publicKey, privateKey } = JSON.parse(json) as ExportedProfileKeysFile
        setExtensionSetting('publicKey', publicKey)
        setExtensionSetting('privateKey', privateKey)
        return true
    } catch (error: any) {
        await dialogManager.alert(error.message)
        return false
    }
}