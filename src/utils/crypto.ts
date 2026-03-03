import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 32;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;

/**
 * 从用户 passphrase 派生密钥
 */
function deriveKey(passphrase: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(passphrase, salt, ITERATIONS, KEY_LENGTH, 'sha256');
}

/**
 * 加密数据
 * @param plaintext - 要加密的内容
 * @param passphrase - 用户 passphrase（用于派生密钥）
 * @returns 加密结果: base64(salt + iv + ciphertext + tag)
 */
export function encrypt(plaintext: string, passphrase: string): string {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = deriveKey(passphrase, salt);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let ciphertext = cipher.update(plaintext, 'utf8', 'base64');
  ciphertext += cipher.final('base64');
  
  const tag = cipher.getAuthTag();

  // 拼接: salt + iv + ciphertext + tag
  const result = Buffer.concat([
    salt,
    iv,
    Buffer.from(ciphertext, 'base64'),
    tag
  ]);

  return result.toString('base64');
}

/**
 * 解密数据
 * @param encryptedData - 加密数据 (base64)
 * @param passphrase - 用户 passphrase
 * @returns 解密后的明文
 */
export function decrypt(encryptedData: string, passphrase: string): string {
  const data = Buffer.from(encryptedData, 'base64');
  
  const salt = data.subarray(0, SALT_LENGTH);
  const iv = data.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const tag = data.subarray(data.length - TAG_LENGTH);
  const ciphertext = data.subarray(SALT_LENGTH + IV_LENGTH, data.length - TAG_LENGTH);

  const key = deriveKey(passphrase, salt);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let plaintext = decipher.update(ciphertext, undefined, 'utf8');
  plaintext += decipher.final('utf8');

  return plaintext;
}

/**
 * 生成随机 passphrase（用于系统生成的 keystore）
 */
export function generatePassphrase(): string {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * Hash 数据（用于存储不可逆的敏感信息）
 */
export function hash(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}
