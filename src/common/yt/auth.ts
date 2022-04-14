import crypto from 'crypto'

function generateKeys() {
    // The `generateKeyPairSync` method accepts two arguments:
    // 1. The type ok keys we want, which in this case is "rsa"
    // 2. An object with the properties of the key
    const keys = crypto.generateKeyPairSync("rsa", {
        // The standard secure default length for RSA keys is 2048 bits
        modulusLength: 2048,
    })

    return keys
}

function encodeKeys(keys: { publicKey: Buffer, privateKey: Buffer }) {
    return JSON.stringify({ publicKey: keys.publicKey.toString('base64'), privateKey: keys.privateKey.toString('base64') })
}

function decodeKeys(encodedKeys: string) {
    const keysBase64 = JSON.parse(encodedKeys)
    return {
        publicKey: Buffer.from(keysBase64.publicKey),
        privateKey: Buffer.from(keysBase64.privateKey)
    }
}

function sign(data: string, privateKey: Buffer) {
    return crypto.sign("sha256", Buffer.from(data), {
        key: privateKey,
        padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
    })
}