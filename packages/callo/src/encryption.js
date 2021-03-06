const crypto = require('crypto');

/**
 * Generate 64-bit / 8-byte salt
 * @return {Buffer} salt
 * @public
 */
function genSalt64() {
  return crypto.randomBytes(8);
}

/**
 * Generate 256-bit / 32-byte key randomly
 * @param {Buffer|null} salt
 * @param iterations
 * @return {Buffer} key
 * @public
 */
function genKey256(salt = null, iterations = 10000) {
  if (!salt) {
    salt = genSalt64();
  }
  return crypto.pbkdf2Sync(crypto.randomBytes(64), salt, iterations, 32, 'sha512');
}

/**
 * Generate 256-bit / 32-byte key randomly based on password
 * Would generate same key ONLY if same salt is supplied
 * @param {string} password
 * @param {Buffer|null} salt
 * @param {number} iterations
 * @public
 */
function genKey256FromPassword(password, salt = null, iterations = 10000) {
  if (!salt) {
    salt = genSalt64();
  }
  return crypto.pbkdf2Sync(password, salt, iterations, 32, 'sha512');
}

/**
 * encrypt an object, using JSON to convert to string first
 * @param {Object} obj
 * @param {Buffer} key
 * @returns {string}
 * @public
 */
function encrypt(obj, key) {
  const json = JSON.stringify(obj);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(json, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

/**
 * decrypted an encrypted JSON
 * @param {string} enc
 * @param {Buffer} key
 * @returns {Object}
 * @public
 */
function decrypt(enc, key) {
  const encoded = Buffer.from(enc, 'base64');
  const iv = encoded.slice(0, 16);
  const tag = encoded.slice(16, 32);
  const text = encoded.slice(32);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const decoded = decipher.update(text, 'binary', 'utf8') + decipher.final('utf8');
  return JSON.parse(decoded);
}

module.exports = {
  genSalt64,
  genKey256,
  genKey256FromPassword,
  encrypt,
  decrypt,
};
