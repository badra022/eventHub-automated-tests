import dotenv from 'dotenv';
import { decrypt, encrypt } from '../utils/crypto';

dotenv.config();

/**
 * Encrypts or decrypts one value with TEST_DATA_KEY, e.g. to edit test-data/users.json by hand:
 *   npm run secret:encrypt -- "my.account@example.com"
 *   npm run secret:decrypt -- "enc:v1:..."
 */
const [command, value] = process.argv.slice(2);
const passphrase = process.env.TEST_DATA_KEY ?? '';

if (!value || (command !== 'encrypt' && command !== 'decrypt')) {
  console.error('Usage: tsx scripts/secret.ts <encrypt|decrypt> <value>');
  process.exit(1);
}

console.log(command === 'encrypt' ? encrypt(value, passphrase) : decrypt(value, passphrase));
