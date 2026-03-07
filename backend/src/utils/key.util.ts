import * as crypto from 'crypto';

const PBKDF2_ITERATIONS = 100000;
const PBKDF2_HASH = 'sha256';

/**
 * Generate RSA key pair for seeding
 */
export function generateUserKeyPair() {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
            type: 'spki',
            format: 'pem'
        },
        privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem'
        }
    });

    return { publicKey, privateKey };
}

/**
 * Encrypt private key with password (AES-GCM)
 * Compatible with frontend implementation
 */
export function encryptPrivateKey(privateKeyPem: string, password: string): string {
    const salt = crypto.randomBytes(16);
    const iv = crypto.randomBytes(12);

    const key = crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, 32, PBKDF2_HASH);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    let encrypted = cipher.update(privateKeyPem, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    const authTag = cipher.getAuthTag().toString('base64');

    // Combine salt, iv, and data
    // Frontend format: salt_b64:iv_b64:data_b64
    // In our GCM implementation, we need to handle the auth tag.
    // SubtleCrypto appends tag to ciphertext.
    const dataWithTag = Buffer.concat([
        Buffer.from(encrypted, 'base64'),
        Buffer.from(authTag, 'base64')
    ]).toString('base64');

    return `${salt.toString('base64')}:${iv.toString('base64')}:${dataWithTag}`;
}

/**
 * Decrypt private key with password (AES-GCM)
 */
export function decryptPrivateKey(encryptedData: string, password: string): string {
    const [saltB64, ivB64, dataWithTagB64] = encryptedData.split(':');
    if (!saltB64 || !ivB64 || !dataWithTagB64) throw new Error('Invalid encrypted key format');

    const salt = Buffer.from(saltB64, 'base64');
    const iv = Buffer.from(ivB64, 'base64');
    const fullData = Buffer.from(dataWithTagB64, 'base64');

    const ciphertext = fullData.subarray(0, fullData.length - 16);
    const authTag = fullData.subarray(fullData.length - 16);

    const key = crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, 32, PBKDF2_HASH);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext, undefined, 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}

/**
 * Encrypt AES session key with RSA public key (RSA-OAEP)
 */
export function encryptWithPublicKey(aesKeyB64: string, publicKeyPem: string): string {
    const buffer = Buffer.from(aesKeyB64, 'base64');
    const encrypted = crypto.publicEncrypt(
        {
            key: publicKeyPem,
            padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
            oaepHash: 'sha256',
        },
        buffer
    );
    return encrypted.toString('base64');
}

/**
 * Generate a random AES-256 key (base64)
 */
export function generateAESKey(): string {
    return crypto.randomBytes(32).toString('base64');
}
