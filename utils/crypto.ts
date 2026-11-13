import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';

/**
 * AES-256-GCM encryption for sensitive test data (account emails and passwords).
 * Encrypted values look like `enc:v1:<salt>:<iv>:<authTag>:<cipherText>` (base64url parts) and are safe to commit;
 * the passphrase (TEST_DATA_KEY) lives only in .env and in the CI secrets.
 */
const PREFIX = 'enc:v1:';
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;

function deriveKey(passphrase: string, salt: Buffer): Buffer {
  if (!passphrase) {
    throw new Error('crypto: TEST_DATA_KEY is empty. Set it in .env locally or as a GitHub secret in CI.');
  }
  return scryptSync(passphrase, salt, KEY_LENGTH);
}

export function isEncrypted(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith(PREFIX);
}

export function encrypt(plainText: string, passphrase: string): string {
  const salt = randomBytes(SALT_LENGTH);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, deriveKey(passphrase, salt), iv);
  const cipherText = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  return PREFIX + [salt, iv, cipher.getAuthTag(), cipherText].map((part) => part.toString('base64url')).join(':');
}

export function decrypt(value: string, passphrase: string): string {
  if (!isEncrypted(value)) {
    throw new Error(`crypto: value is not in the "${PREFIX}" format`);
  }
  const parts = value.slice(PREFIX.length).split(':');
  if (parts.length !== 4) {
    throw new Error(`crypto: malformed encrypted value (expected 4 parts after "${PREFIX}", got ${parts.length})`);
  }

  const [salt, iv, authTag, cipherText] = parts.map((part) => Buffer.from(part, 'base64url'));
  const decipher = createDecipheriv(ALGORITHM, deriveKey(passphrase, salt), iv);
  decipher.setAuthTag(authTag);
  try {
    return Buffer.concat([decipher.update(cipherText), decipher.final()]).toString('utf8');
  } catch {
    throw new Error('crypto: decryption failed (wrong TEST_DATA_KEY or tampered value)');
  }
}

/** Returns a copy of `record` with every encrypted string value decrypted; other values are kept as is. */
export function decryptRecord<T extends Record<string, unknown>>(record: T, passphrase: string): T {
  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => [key, isEncrypted(value) ? decrypt(value, passphrase) : value]),
  ) as T;
}
