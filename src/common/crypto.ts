import { getExtensionSettingsAsync } from "./settings"
import { setSetting } from "./useSettings"

export async function generateKeys() {
    const keys = await window.crypto.subtle.generateKey(
        {
            name: "RSASSA-PKCS1-v1_5",
            // Consider using a 4096-bit key for systems that require long-term security
            modulusLength: 2048,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: "SHA-256",
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

async function exportPublicKey(key: CryptoKey) {
    const exported = await window.crypto.subtle.exportKey(
        "spki",
        key
    )
    return Buffer.from(exported).toString('base64')
}

function importPrivateKey(base64: string) {

    return window.crypto.subtle.importKey(
        "pkcs8",
        Buffer.from(base64, 'base64'),
        {
            name: "RSASSA-PKCS1-v1_5",
            hash: "SHA-256",
        },
        true,
        ["sign"]
    )
}

export async function sign(data: string, privateKey: string) {
    return Buffer.from(await window.crypto.subtle.sign(
        { name: "RSASSA-PKCS1-v1_5" },
        await importPrivateKey(privateKey),
        Buffer.from(data)
    )).toString('base64')
}

export async function loginAndSetNickname() {
    const settings = await getExtensionSettingsAsync()

    let nickname;
    while (true)
    {
        nickname = prompt("Pick a nickname")
        if (nickname) break
        if (nickname === null) return
        alert("Invalid nickname")
    }

    if (!settings.privateKey || !settings.publicKey)
        await generateKeys().then((keys) => {
            setSetting('publicKey', keys.publicKey)
            setSetting('privateKey', keys.privateKey)
        })
    
    const url = new URL('https://finder.madiator.com/api/v1/profile')
    url.searchParams.set('data', JSON.stringify({ nickname }))
    url.searchParams.set('keys', JSON.stringify({
        signature: await sign(url.searchParams.toString(), settings.privateKey!),
        publicKey: settings.publicKey
    }))
    const respond = await fetch(url.href, { method: "POST" })
    if (respond.ok) alert(`Your nickname has been set to ${nickname}`)
    else alert((await respond.json()).message)
}