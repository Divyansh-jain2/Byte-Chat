/**
 * E2EE Utilities (Web Crypto API)
 * Strictly aligned with the specifications in 'Curr' design document.
 */

const PBKDF2_ITERATIONS = 100000;
const PBKDF2_HASH = 'SHA-256';

/**
 * Generate a new RSA-OAEP key pair for a user
 */
export async function generateUserKeyPair(): Promise<{ publicKey: string; privateKey: string }> {
    const keyPair = await window.crypto.subtle.generateKey(
        {
            name: 'RSA-OAEP',
            modulusLength: 2048,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: 'SHA-256',
        },
        true,
        ['encrypt', 'decrypt']
    );

    const publicKeyBuf = await window.crypto.subtle.exportKey('spki', keyPair.publicKey);
    const privateKeyBuf = await window.crypto.subtle.exportKey('pkcs8', keyPair.privateKey);

    return {
        publicKey: arrayBufferToPem(publicKeyBuf as ArrayBuffer, 'PUBLIC KEY'),
        privateKey: arrayBufferToPem(privateKeyBuf as ArrayBuffer, 'PRIVATE KEY'),
    };
}

/**
 * Derive an encryption key from a password using PBKDF2
 */
async function deriveKeyFromPassword(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
        'raw',
        enc.encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
    );

    return (window.crypto.subtle as any).deriveKey(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: PBKDF2_ITERATIONS,
            hash: PBKDF2_HASH,
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

/**
 * Encrypt private key with password (AES-GCM)
 */
export async function encryptPrivateKey(privateKeyPem: string, password: string): Promise<string> {
    const enc = new TextEncoder();
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    const key = await deriveKeyFromPassword(password, salt);
    const encrypted = await (window.crypto.subtle as any).encrypt(
        { name: 'AES-GCM', iv },
        key,
        enc.encode(privateKeyPem)
    );

    // Output format: salt_b64:iv_b64:data_b64
    return `${bufToBase64(salt.buffer as ArrayBuffer)}:${bufToBase64(iv.buffer as ArrayBuffer)}:${bufToBase64(encrypted)}`;
}

/**
 * Decrypt private key with password (AES-GCM)
 */
export async function decryptPrivateKey(encryptedData: string, password: string): Promise<string> {
    const [saltB64, ivB64, dataB64] = encryptedData.split(':');
    if (!saltB64 || !ivB64 || !dataB64) throw new Error('Invalid encrypted key format');

    const salt = base64ToBuf(saltB64);
    const iv = base64ToBuf(ivB64);
    const data = base64ToBuf(dataB64);

    const key = await deriveKeyFromPassword(password, salt);
    const decrypted = await (window.crypto.subtle as any).decrypt(
        { name: 'AES-GCM', iv },
        key,
        data
    );

    return new TextDecoder().decode(decrypted);
}

/**
 * Generate a new AES key for a chat session
 */
export async function generateAESKey(): Promise<CryptoKey> {
    return window.crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
    );
}

/**
 * Export AES key to Base64
 */
export async function exportKeyToBase64(key: CryptoKey): Promise<string> {
    const exported = await window.crypto.subtle.exportKey('raw', key);
    return bufToBase64(exported);
}

/**
 * Import AES key from Base64
 */
export async function importKeyFromBase64(base64Key: string): Promise<CryptoKey> {
    const buf = base64ToBuf(base64Key);
    return (window.crypto.subtle as any).importKey(
        'raw',
        buf,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
    );
}

/**
 * Encrypt AES key using RSA Public Key (RSA-OAEP)
 */
export async function encryptKeyWithPublicKey(aesKeyBase64: string, publicKeyPem: string): Promise<string> {
    const pubKey = await importPublicKey(publicKeyPem);
    // const enc = new TextEncoder();
    const encrypted = await (window.crypto.subtle as any).encrypt(
        { name: 'RSA-OAEP' },
        pubKey,
        base64ToBuf(aesKeyBase64)
    );

    return bufToBase64(encrypted);
}

/**
 * Decrypt AES key using RSA Private Key (RSA-OAEP)
 */
export async function decryptKeyWithPrivateKey(privateKey: CryptoKey, encryptedKeyB64: string): Promise<string> {
    const decrypted = await (window.crypto.subtle as any).decrypt(
        { name: 'RSA-OAEP' },
        privateKey,
        base64ToBuf(encryptedKeyB64)
    );

    return bufToBase64(decrypted);
}

/**
 * Encrypt message with AES-GCM
 */
export async function encryptMessageAES(text: string, aesKey: CryptoKey): Promise<{ ciphertext: string; iv: string; authTag: string }> {
    const enc = new TextEncoder();
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    const encrypted = await (window.crypto.subtle as any).encrypt(
        { name: 'AES-GCM', iv },
        aesKey,
        enc.encode(text)
    );

    // Symmetric encryption with GCM: last 16 bytes are the auth tag
    const combined = new Uint8Array(encrypted);
    const ciphertext = combined.slice(0, combined.length - 16);
    const authTag = combined.slice(combined.length - 16);

    return {
        ciphertext: bufToBase64(ciphertext.buffer as ArrayBuffer),
        iv: bufToBase64(iv.buffer as ArrayBuffer),
        authTag: bufToBase64(authTag.buffer as ArrayBuffer),
    };
}

/**
 * Decrypt message with AES-GCM
 */
export async function decryptMessageAES(ciphertext: string, iv: string, authTag: string, aesKey: CryptoKey): Promise<string> {
    const cipherBuf = base64ToBuf(ciphertext);
    const ivBuf = base64ToBuf(iv);
    const tagBuf = base64ToBuf(authTag);

    // Combine ciphertext and tag for SubtleCrypto
    const combined = new Uint8Array(cipherBuf.length + tagBuf.length);
    combined.set(new Uint8Array(cipherBuf));
    combined.set(new Uint8Array(tagBuf), cipherBuf.length);

    const decrypted = await (window.crypto.subtle as any).decrypt(
        { name: 'AES-GCM', iv: ivBuf },
        aesKey,
        combined
    );

    return new TextDecoder().decode(decrypted);
}

// --- Helper Functions ---

function bufToBase64(buf: ArrayBuffer): string {
    return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function base64ToBuf(b64: string): Uint8Array {
    return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
}

function arrayBufferToPem(buf: ArrayBuffer, type: 'PUBLIC KEY' | 'PRIVATE KEY'): string {
    const b64 = bufToBase64(buf);
    const lines = b64.match(/.{1,64}/g)?.join('\n') || '';
    return `-----BEGIN ${type}-----\n${lines}\n-----END ${type}-----`;
}

export async function importPublicKey(pem: string): Promise<CryptoKey> {
    const b64 = pem.replace(/-----BEGIN PUBLIC KEY-----|-----END PUBLIC KEY-----|\n|\r/g, '');
    const buf = base64ToBuf(b64);
    return (window.crypto.subtle as any).importKey(
        'spki',
        buf,
        { name: 'RSA-OAEP', hash: 'SHA-256' },
        false,
        ['encrypt']
    );
}

export async function importPrivateKey(pem: string): Promise<CryptoKey> {
    const b64 = pem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\n|\r/g, '');
    const buf = base64ToBuf(b64);
    return (window.crypto.subtle as any).importKey(
        'pkcs8',
        buf,
        { name: 'RSA-OAEP', hash: 'SHA-256' },
        false,
        ['decrypt']
    );
}
