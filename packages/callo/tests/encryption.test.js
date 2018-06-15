const {
  genSalt64,
  genKey256,
  genKey256FromPassword,
  encrypt,
  decrypt,
} = require('../dist/encryption');
const crypto = require('crypto');

describe('test encryption', () => {
  let key256 = crypto.randomBytes(32);

  test('generate 64 bit salt', () => {
    let salt = genSalt64();
    expect(salt.length).toBe(8); // 8 bytes
  });

  test('generate 256 bit key', () => {
    let key = genKey256();
    expect(key.length).toBe(32); // 32 bytes
  });

  test('generate 256 bit key from password', () => {
    let password = 'this is a very not secure password';
    expect(genKey256FromPassword(password).length).toBe(32); // 32 bytes
  });

  test('encrypt and decrypt with key', () => {
    let data = { n: 1, o: { s: 'string' } };
    let encrypted = encrypt(data, key256);
    let decrypted = decrypt(encrypted, key256);
    expect(decrypted.n).toBe(data.n);
    expect(decrypted.o.s).toBe('string');
  })
});
