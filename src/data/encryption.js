/**
 * Encryption Module
 * AES-256 encryption for data protection using Web Crypto API
 * Provides encrypt/decrypt utilities for sensitive data
 */

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12;
const SALT_LENGTH = 16;
const ITERATIONS = 100000;

/**
 * Derive an AES-256 key from a password using PBKDF2
 */
async function deriveKey(password, salt) {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
    );

    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: ITERATIONS,
            hash: 'SHA-256'
        },
        keyMaterial,
        { name: ALGORITHM, length: KEY_LENGTH },
        false,
        ['encrypt', 'decrypt']
    );
}

/**
 * Encrypt a string using AES-256-GCM
 * @param {string} plaintext - Data to encrypt
 * @param {string} password - Encryption password/key
 * @returns {string} Base64-encoded encrypted data (salt:iv:ciphertext)
 */
export async function encrypt(plaintext, password) {
    try {
        const encoder = new TextEncoder();
        const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
        const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
        const key = await deriveKey(password, salt);

        const encrypted = await crypto.subtle.encrypt(
            { name: ALGORITHM, iv: iv },
            key,
            encoder.encode(plaintext)
        );

        // Combine salt + iv + ciphertext
        const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
        combined.set(salt, 0);
        combined.set(iv, salt.length);
        combined.set(new Uint8Array(encrypted), salt.length + iv.length);

        // Return as base64
        return btoa(String.fromCharCode(...combined));
    } catch (error) {
        console.error('[Encryption] Encrypt failed:', error);
        return null;
    }
}

/**
 * Decrypt a string encrypted with AES-256-GCM
 * @param {string} encryptedBase64 - Base64-encoded encrypted data
 * @param {string} password - Decryption password/key
 * @returns {string|null} Decrypted plaintext or null on failure
 */
export async function decrypt(encryptedBase64, password) {
    try {
        const combined = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));

        const salt = combined.slice(0, SALT_LENGTH);
        const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
        const ciphertext = combined.slice(SALT_LENGTH + IV_LENGTH);

        const key = await deriveKey(password, salt);

        const decrypted = await crypto.subtle.decrypt(
            { name: ALGORITHM, iv: iv },
            key,
            ciphertext
        );

        const decoder = new TextDecoder();
        return decoder.decode(decrypted);
    } catch (error) {
        console.error('[Encryption] Decrypt failed:', error);
        return null;
    }
}

/**
 * Encrypt a JSON object
 * @param {Object} data - Object to encrypt
 * @param {string} password - Encryption password
 * @returns {string|null} Encrypted base64 string
 */
export async function encryptJSON(data, password) {
    return encrypt(JSON.stringify(data), password);
}

/**
 * Decrypt to a JSON object
 * @param {string} encryptedBase64 - Encrypted base64 string
 * @param {string} password - Decryption password
 * @returns {Object|null} Decrypted object or null
 */
export async function decryptJSON(encryptedBase64, password) {
    const plaintext = await decrypt(encryptedBase64, password);
    if (!plaintext) return null;
    try {
        return JSON.parse(plaintext);
    } catch {
        return null;
    }
}

/**
 * Generate a random encryption key (for app-level encryption)
 */
export function generateEncryptionKey() {
    const array = crypto.getRandomValues(new Uint8Array(32));
    return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Check if Web Crypto API is available
 */
export function isEncryptionAvailable() {
    return typeof crypto !== 'undefined' &&
        typeof crypto.subtle !== 'undefined' &&
        typeof crypto.getRandomValues === 'function';
}

/**
 * Get encryption status info
 */
export function getEncryptionStatus() {
    const available = isEncryptionAvailable();
    const isHTTPS = location.protocol === 'https:' || location.hostname === 'localhost';

    return {
        webCryptoAvailable: available,
        httpsActive: isHTTPS,
        e2eReady: available && isHTTPS,
        summary: available
            ? (isHTTPS
                ? '🔒 Mã hóa end-to-end đã sẵn sàng (AES-256-GCM + HTTPS)'
                : '⚠️ Web Crypto có sẵn nhưng cần HTTPS cho bảo mật tối đa')
            : '❌ Web Crypto API không khả dụng trên trình duyệt này'
    };
}
