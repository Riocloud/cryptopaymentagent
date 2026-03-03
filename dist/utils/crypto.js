"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.encrypt = encrypt;
exports.decrypt = decrypt;
exports.generatePassphrase = generatePassphrase;
exports.hash = hash;
const crypto_1 = __importDefault(require("crypto"));
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 32;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;
/**
 * 从用户 passphrase 派生密钥
 */
function deriveKey(passphrase, salt) {
    return crypto_1.default.pbkdf2Sync(passphrase, salt, ITERATIONS, KEY_LENGTH, 'sha256');
}
/**
 * 加密数据
 * @param plaintext - 要加密的内容
 * @param passphrase - 用户 passphrase（用于派生密钥）
 * @returns 加密结果: base64(salt + iv + ciphertext + tag)
 */
function encrypt(plaintext, passphrase) {
    const salt = crypto_1.default.randomBytes(SALT_LENGTH);
    const iv = crypto_1.default.randomBytes(IV_LENGTH);
    const key = deriveKey(passphrase, salt);
    const cipher = crypto_1.default.createCipheriv(ALGORITHM, key, iv);
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
function decrypt(encryptedData, passphrase) {
    const data = Buffer.from(encryptedData, 'base64');
    const salt = data.subarray(0, SALT_LENGTH);
    const iv = data.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const tag = data.subarray(data.length - TAG_LENGTH);
    const ciphertext = data.subarray(SALT_LENGTH + IV_LENGTH, data.length - TAG_LENGTH);
    const key = deriveKey(passphrase, salt);
    const decipher = crypto_1.default.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    let plaintext = decipher.update(ciphertext, undefined, 'utf8');
    plaintext += decipher.final('utf8');
    return plaintext;
}
/**
 * 生成随机 passphrase（用于系统生成的 keystore）
 */
function generatePassphrase() {
    return crypto_1.default.randomBytes(32).toString('base64url');
}
/**
 * Hash 数据（用于存储不可逆的敏感信息）
 */
function hash(data) {
    return crypto_1.default.createHash('sha256').update(data).digest('hex');
}
//# sourceMappingURL=crypto.js.map