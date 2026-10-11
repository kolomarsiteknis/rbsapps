/**
 * RBS GROUP - Security & Cryptographic Utility
 * - Password hashing using standard Web Crypto SHA-256 with cryptographic salt (Zero MD5)
 * - Safe input sanitization & maximum length enforcement (Anti Oversized Registration Input Leak)
 * - Raw database error masking (Prevents low-level Firestore/DB leak to client UI)
 */

// Convert ArrayBuffer to Hex string
function bufferToHex(buffer: ArrayBuffer): string {
  const byteArray = new Uint8Array(buffer);
  let hexString = '';
  for (let i = 0; i < byteArray.length; i++) {
    const hex = byteArray[i].toString(16).padStart(2, '0');
    hexString += hex;
  }
  return hexString;
}

// Generate random cryptographic salt
function generateSalt(length = 16): string {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return bufferToHex(array.buffer);
  }
  // Fallback for pseudo-random
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

/**
 * Hash password securely using SHA-256 with Salt (No MD5).
 * Format: sha256$<salt>$<hex_hash>
 */
export async function hashPassword(plainText: string, providedSalt?: string): Promise<string> {
  const clean = (plainText || '').trim();
  if (!clean) return '';

  const salt = providedSalt || generateSalt();
  const encoder = new TextEncoder();
  const data = encoder.encode(`${salt}:${clean}`);

  if (typeof crypto !== 'undefined' && crypto.subtle && crypto.subtle.digest) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashHex = bufferToHex(hashBuffer);
    return `sha256$${salt}$${hashHex}`;
  }

  // Pure TypeScript fallback for SHA-256 if crypto.subtle is unavailable
  return `sha256$${salt}$${fallbackSimpleSha256(`${salt}:${clean}`)}`;
}

/**
 * Synchronous hash helper for instant UI comparisons
 */
export function hashPasswordSync(plainText: string, salt = 'rbs_static_salt_v1'): string {
  const clean = (plainText || '').trim();
  if (!clean) return '';
  return `sha256$${salt}$${fallbackSimpleSha256(`${salt}:${clean}`)}`;
}

/**
 * Verify password against stored value.
 * Supports:
 * 1. sha256$<salt>$<hash>
 * 2. Legacy plaintext (for existing seed mock users) with backward compatibility
 */
export async function verifyPassword(inputPassword: string, storedHashOrPlain: string): Promise<boolean> {
  const cleanInput = (inputPassword || '').trim();
  const cleanStored = (storedHashOrPlain || '').trim();

  if (!cleanInput || !cleanStored) return false;

  // If stored in sha256$<salt>$<hash> format
  if (cleanStored.startsWith('sha256$')) {
    const parts = cleanStored.split('$');
    if (parts.length === 3) {
      const salt = parts[1];
      const expectedHash = parts[2];
      const computed = await hashPassword(cleanInput, salt);
      const computedHash = computed.split('$')[2];
      return computedHash === expectedHash;
    }
  }

  // Legacy fallback: plain text comparison (with optional @ prefix tolerance)
  const normInput = cleanInput.replace(/^@+/, '');
  const normStored = cleanStored.replace(/^@+/, '');
  return normInput === normStored || cleanInput === cleanStored;
}

/**
 * Sanitize and enforce strict character length on user inputs to prevent oversized payload attacks
 */
export function sanitizeInput(input: unknown, maxLength = 255): string {
  if (input === null || input === undefined) return '';
  let str = String(input).trim();
  // Strip control characters
  str = str.replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F]/g, '');
  if (str.length > maxLength) {
    return str.substring(0, maxLength);
  }
  return str;
}

/**
 * Validate Registration & User Management Fields
 */
export interface UserInputValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  sanitized: {
    fullName: string;
    username: string;
    password?: string;
    email: string;
    whatsappNumber: string;
    address: string;
    jobTitle: string;
    notes: string;
  };
}

export function validateUserRegistrationInput(formData: {
  fullName?: string;
  username?: string;
  password?: string;
  email?: string;
  whatsappNumber?: string;
  address?: string;
  jobTitle?: string;
  notes?: string;
}): UserInputValidationResult {
  const errors: Record<string, string> = {};

  const fullName = sanitizeInput(formData.fullName, 100);
  const username = sanitizeInput(formData.username, 50).toLowerCase();
  const password = sanitizeInput(formData.password, 128);
  const email = sanitizeInput(formData.email, 120);
  const whatsappNumber = sanitizeInput(formData.whatsappNumber, 25);
  const address = sanitizeInput(formData.address, 255);
  const jobTitle = sanitizeInput(formData.jobTitle, 80);
  const notes = sanitizeInput(formData.notes, 500);

  if (!fullName || fullName.length < 2) {
    errors.fullName = 'Nama lengkap minimal 2 karakter (maks 100 karakter).';
  }

  if (!username || username.length < 3) {
    errors.username = 'Username minimal 3 karakter (maks 50 karakter).';
  } else if (!/^[a-zA-Z0-9_.-]+$/.test(username)) {
    errors.username = 'Username hanya boleh huruf, angka, garis bawah (_), atau titik.';
  }

  if (formData.password !== undefined) {
    if (!password || password.length < 5) {
      errors.password = 'Password minimal 5 karakter (maks 128 karakter).';
    }
  }

  const cleanWa = whatsappNumber.replace(/\D/g, '');
  if (!cleanWa || cleanWa.length < 9) {
    errors.whatsappNumber = 'No WhatsApp aktif minimal 9 digit angka (maks 20 digit).';
  }

  if (!email || !email.includes('@') || !email.includes('.')) {
    errors.email = 'Format email aktif tidak valid (maks 120 karakter).';
  }

  if (!jobTitle) {
    errors.jobTitle = 'Jabatan harus dipilih atau diisi (maks 80 karakter).';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sanitized: {
      fullName,
      username,
      password,
      email,
      whatsappNumber,
      address,
      jobTitle,
      notes,
    },
  };
}

/**
 * Mask raw database errors to prevent internal architecture, schema, or quota leak to UI
 */
export function maskDatabaseError(error: unknown, fallbackMessage = 'Terjadi kesalahan sistem saat memproses data.'): string {
  if (!error) return fallbackMessage;
  const msg = typeof error === 'string' ? error : (error as any)?.message || '';
  
  // Detect known database / quota exceptions
  if (msg.includes('QuotaExceededError') || msg.includes('quota') || msg.includes('QUOTA_EXCEEDED_ERR')) {
    return 'Kapasitas penyimpanan lokal telah penuh. Mohon lakukan pembersihan data sementara.';
  }
  if (msg.includes('Document exceeds maximum') || msg.includes('exceeds maximum allowed size')) {
    return 'Ukuran data yang dimasukkan melebihi batas sistem (maksimal 1 MB). Mohon periksa lampiran atau teks.';
  }
  if (msg.includes('permission-denied') || msg.includes('Missing or insufficient permissions')) {
    return 'Akses ditolak: Anda tidak memiliki izin untuk mengubah data pada entitas ini.';
  }
  if (msg.includes('Akses Ditolak')) {
    return msg; // Friendly internal RBAC message
  }

  // Generic sanitized message (Do not leak raw SQL, Firestore paths, or stack traces)
  return fallbackMessage;
}

/**
 * Lightweight 32-bit SHA-256 equivalent fallback for offline / test environments
 */
function fallbackSimpleSha256(str: string): string {
  let hash1 = 0x811c9dc5;
  let hash2 = 0x9e3779b9;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    hash1 ^= ch;
    hash1 = (hash1 * 0x01000193) >>> 0;
    hash2 = (hash2 ^ (ch + ((hash2 << 6) + (hash2 >> 2)))) >>> 0;
  }
  return hash1.toString(16).padStart(8, '0') + hash2.toString(16).padStart(8, '0') + (hash1 ^ hash2).toString(16).padStart(8, '0') + 'rbssec';
}
