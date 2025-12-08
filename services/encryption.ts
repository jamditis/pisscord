/**
 * Client-Side Encryption Service
 *
 * Encrypts messages before sending to Firebase, decrypts when receiving.
 * Uses Web Crypto API with AES-256-GCM for authenticated encryption.
 *
 * SIMPLIFIED ARCHITECTURE:
 * - Salt is stored in Firebase (shared by all users automatically)
 * - Users only need to know the passphrase
 * - Admin sets the passphrase once, shares it out-of-band with new members
 */

import {
  getDatabase,
  ref,
  get,
  set
} from "firebase/database";
import { initializeApp, getApps } from "firebase/app";

const STORAGE_KEY = 'pisscord_encryption_unlocked';
const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const KEY_LENGTH = 256;
const ITERATIONS = 100000;

let cachedKey: CryptoKey | null = null;
let cachedSalt: Uint8Array | null = null;

// Get Firebase database reference
function getDb() {
  const apps = getApps();
  if (apps.length === 0) {
    throw new Error('Firebase not initialized');
  }
  return getDatabase(apps[0]);
}

/**
 * Convert ArrayBuffer to base64 string
 */
function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert base64 string to ArrayBuffer
 */
function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Derive an AES-256-GCM key from a passphrase and salt
 */
async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: ITERATIONS,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Fetch the shared salt from Firebase
 * Creates one if it doesn't exist (first-time setup by admin)
 */
async function getOrCreateSalt(): Promise<Uint8Array> {
  const db = getDb();
  const saltRef = ref(db, 'system/encryptionSalt');

  try {
    const snapshot = await get(saltRef);
    if (snapshot.exists()) {
      // Salt exists - use it
      const saltBase64 = snapshot.val();
      return new Uint8Array(base64ToBuffer(saltBase64));
    } else {
      // No salt - create one (first user/admin)
      const newSalt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
      const saltBase64 = bufferToBase64(newSalt.buffer);
      await set(saltRef, saltBase64);
      console.log('[Encryption] Created new encryption salt in Firebase');
      return newSalt;
    }
  } catch (error) {
    console.error('[Encryption] Failed to get/create salt:', error);
    throw new Error('Could not initialize encryption. Check your connection.');
  }
}

/**
 * Check if encryption is ready (key is cached for this session)
 */
export function isEncryptionSetUp(): boolean {
  return cachedKey !== null;
}

/**
 * Check if user has previously unlocked encryption
 * (stored flag - they've entered the correct passphrase before)
 */
export function hasStoredPassphrase(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Unlock encryption with passphrase
 * Fetches salt from Firebase, derives key, and caches it for the session.
 *
 * @returns true if passphrase was accepted
 */
export async function unlockEncryption(passphrase: string): Promise<boolean> {
  if (!passphrase || passphrase.length < 4) {
    throw new Error('Passphrase must be at least 4 characters');
  }

  try {
    // Get the shared salt from Firebase
    const salt = await getOrCreateSalt();

    // Derive the encryption key
    const key = await deriveKey(passphrase, salt);

    // Cache for session
    cachedKey = key;
    cachedSalt = salt;

    // Remember that user has unlocked (for showing lock icon, etc.)
    localStorage.setItem(STORAGE_KEY, 'true');

    console.log('[Encryption] Encryption unlocked successfully');
    return true;
  } catch (error) {
    console.error('[Encryption] Failed to unlock:', error);
    throw error;
  }
}

/**
 * Clear encryption from current session (but keep localStorage flag)
 */
export function clearEncryption(): void {
  cachedKey = null;
  cachedSalt = null;
}

/**
 * Completely reset encryption (removes all local state)
 */
export function resetEncryption(): void {
  localStorage.removeItem(STORAGE_KEY);
  cachedKey = null;
  cachedSalt = null;
}

/**
 * Encrypt a message
 * Returns base64 encoded string: IV + ciphertext + auth tag
 */
export async function encryptMessage(plaintext: string): Promise<string> {
  if (!cachedKey) {
    throw new Error('Encryption not unlocked. Call unlockEncryption first.');
  }

  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);

  // Generate random IV for each message
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  // Encrypt
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    cachedKey,
    data
  );

  // Combine IV + ciphertext
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);

  return bufferToBase64(combined.buffer);
}

/**
 * Decrypt a message
 * Expects base64 encoded string: IV + ciphertext + auth tag
 */
export async function decryptMessage(encrypted: string): Promise<string> {
  if (!cachedKey) {
    throw new Error('Encryption not unlocked. Call unlockEncryption first.');
  }

  try {
    const combined = new Uint8Array(base64ToBuffer(encrypted));

    // Extract IV and ciphertext
    const iv = combined.slice(0, IV_LENGTH);
    const ciphertext = combined.slice(IV_LENGTH);

    // Decrypt
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      cachedKey,
      ciphertext
    );

    const decoder = new TextDecoder();
    return decoder.decode(plaintext);
  } catch (error) {
    // Decryption failed - wrong key or corrupted data
    console.error('[Encryption] Decryption failed:', error);
    return '[Unable to decrypt - wrong passphrase?]';
  }
}

/**
 * Check if a string looks like an encrypted message
 * (vs old unencrypted messages)
 */
export function isEncryptedMessage(text: string): boolean {
  // Encrypted messages are base64 and at least IV_LENGTH + some ciphertext
  if (!text || text.length < 20) return false;

  // Check if it's valid base64
  try {
    const decoded = atob(text);
    // Should be at least IV (12 bytes) + some ciphertext
    return decoded.length >= IV_LENGTH + 1;
  } catch {
    return false;
  }
}

// Legacy exports for compatibility - no longer needed but kept for imports
export const setupEncryption = unlockEncryption;
export const importEncryption = async (passphrase: string, _salt: string) => unlockEncryption(passphrase);
export const getEncryptionSalt = () => null; // Salt is now in Firebase
