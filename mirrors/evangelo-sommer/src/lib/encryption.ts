// Encryption utilities for sensitive data (OAuth tokens, API keys, etc.)
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

// Encryption configuration
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const SALT_LENGTH = 32;
const AUTH_TAG_LENGTH = 16;

// Get encryption key from environment or generate for development
function getEncryptionKey(): Buffer {
  const secret = process.env.ENCRYPTION_SECRET || process.env.NEXTAUTH_SECRET;

  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('ENCRYPTION_SECRET or NEXTAUTH_SECRET must be set in production');
    }
    console.warn('⚠️  Using default encryption key - SET ENCRYPTION_SECRET in production!');
    return Buffer.from('development-encryption-key-change-in-production-32bytes!!');
  }

  // Derive a consistent key from the secret
  const salt = Buffer.from('evangelosommer-encryption-salt');
  return scryptSync(secret, salt, KEY_LENGTH);
}

/**
 * Encrypt sensitive data (OAuth tokens, API keys, etc.)
 * @param plaintext The data to encrypt
 * @returns Encrypted data in format: iv:authTag:encryptedData (base64)
 */
export function encrypt(plaintext: string): string {
  if (!plaintext) {
    throw new Error('Cannot encrypt empty string');
  }

  try {
    const key = getEncryptionKey();
    const iv = randomBytes(IV_LENGTH);

    const cipher = createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    const authTag = cipher.getAuthTag();

    // Return format: iv:authTag:encryptedData
    return [
      iv.toString('base64'),
      authTag.toString('base64'),
      encrypted
    ].join(':');
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt sensitive data
 * @param encryptedData Encrypted data in format: iv:authTag:encryptedData
 * @returns Decrypted plaintext
 */
export function decrypt(encryptedData: string): string {
  if (!encryptedData) {
    throw new Error('Cannot decrypt empty string');
  }

  try {
    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }

    const [ivB64, authTagB64, encrypted] = parts;

    const key = getEncryptionKey();
    const iv = Buffer.from(ivB64, 'base64');
    const authTag = Buffer.from(authTagB64, 'base64');

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Encrypt an object (useful for storing JSON data)
 * @param data Object to encrypt
 * @returns Encrypted string
 */
export function encryptObject<T>(data: T): string {
  const json = JSON.stringify(data);
  return encrypt(json);
}

/**
 * Decrypt to an object
 * @param encryptedData Encrypted string
 * @returns Decrypted object
 */
export function decryptObject<T>(encryptedData: string): T {
  const json = decrypt(encryptedData);
  return JSON.parse(json);
}

/**
 * Hash sensitive data for comparison (one-way, cannot be reversed)
 * Useful for checking if a token has changed without storing the actual token
 * @param data Data to hash
 * @returns SHA-256 hash (hex)
 */
export function hashData(data: string): string {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Securely erase a string from memory (best effort)
 * @param str String to erase
 */
export function secureErase(str: string): void {
  if (typeof str !== 'string') return;

  // Overwrite the string data (best effort - not guaranteed in all JS engines)
  // @ts-ignore
  for (let i = 0; i < str.length; i++) {
    // @ts-ignore
    str[i] = '\0';
  }
}
