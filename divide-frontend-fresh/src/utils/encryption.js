// Simple AES-GCM encryption for moderator chat
// Uses Web Crypto API for browser-native encryption

const ENCRYPTION_KEY_NAME = 'moderator-chat-key';

// Generate or retrieve encryption key
async function getEncryptionKey() {
  // In production, you'd want to derive this from a secure source
  // For now, we'll use a key stored in sessionStorage (rotates per session)
  let keyData = sessionStorage.getItem(ENCRYPTION_KEY_NAME);
  
  if (!keyData) {
    // Generate new key
    const key = await window.crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256,
      },
      true,
      ['encrypt', 'decrypt']
    );
    
    // Export and store
    const exported = await window.crypto.subtle.exportKey('raw', key);
    keyData = btoa(String.fromCharCode(...new Uint8Array(exported)));
    sessionStorage.setItem(ENCRYPTION_KEY_NAME, keyData);
    
    return key;
  }
  
  // Import existing key
  const rawKey = Uint8Array.from(atob(keyData), c => c.charCodeAt(0));
  return await window.crypto.subtle.importKey(
    'raw',
    rawKey,
    'AES-GCM',
    true,
    ['encrypt', 'decrypt']
  );
}

// Encrypt a message
export async function encryptMessage(plaintext) {
  try {
    const key = await getEncryptionKey();
    const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for GCM
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);
    
    const ciphertext = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      data
    );
    
    // Combine IV and ciphertext
    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(ciphertext), iv.length);
    
    // Return as base64
    return btoa(String.fromCharCode(...combined));
  } catch (err) {
    console.error('Encryption failed:', err);
    return plaintext; // Fallback to plaintext on error
  }
}

// Decrypt a message
export async function decryptMessage(encrypted) {
  try {
    const key = await getEncryptionKey();
    const combined = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
    
    // Extract IV and ciphertext
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);
    
    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      ciphertext
    );
    
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (err) {
    console.error('Decryption failed:', err);
    return encrypted; // Fallback to showing encrypted text
  }
}

// Check if encryption is supported
export function isEncryptionSupported() {
  return !!(window.crypto && window.crypto.subtle);
}
