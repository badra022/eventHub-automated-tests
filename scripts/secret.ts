import dotenv from 'dotenv';
import { decrypt, encrypt } from '../utils/crypto';

dotenv.config();

/**
 * Encrypts or decrypts one value with TEST_DATA_KEY, e.g. to edit test-data/users.json by hand.
 * Pipe the value in rather than passing it as an argument, so plain text never lands in the shell history:
 *   "my.account@example.com" | npm run secret:encrypt --silent
 *   npm run secret:decrypt -- "enc:v1:..."
 * Decrypting is refused on CI, where the output would end up in public logs.
 */
const [command, argValue] = process.argv.slice(2);
const passphrase = process.env.TEST_DATA_KEY ?? '';

async function readStdin(): Promise<string> {
  if (process.stdin.isTTY) return '';
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString('utf8').trim();
}

if (command !== 'encrypt' && command !== 'decrypt') {
  console.error('Usage: <value> | tsx scripts/secret.ts <encrypt|decrypt>   (or pass the value as the last argument)');
  process.exit(1);
}
if (command === 'decrypt' && process.env.CI) {
  console.error('Refusing to decrypt on CI: the plain text would be written to the job log.');
  process.exit(1);
}

async function main(): Promise<void> {
  const value = argValue ?? (await readStdin());
  if (!value) {
    console.error(`No value to ${command}: pipe it in or pass it as an argument.`);
    process.exit(1);
  }
  console.log(command === 'encrypt' ? encrypt(value, passphrase) : await decrypt(value, passphrase));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
