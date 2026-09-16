import { decryptCredential, encryptCredential } from './credential-crypto.util';

describe('credential-crypto.util', () => {
  const originalKey = process.env.CREDENTIALS_ENCRYPTION_KEY;

  beforeAll(() => {
    process.env.CREDENTIALS_ENCRYPTION_KEY = 'test-only-secret';
  });

  afterAll(() => {
    process.env.CREDENTIALS_ENCRYPTION_KEY = originalKey;
  });

  it('round-trips a value through encrypt/decrypt', () => {
    const encrypted = encryptCredential('4821');
    expect(encrypted).not.toEqual('4821');
    expect(decryptCredential(encrypted)).toBe('4821');
  });

  it('produces a different ciphertext each time (random IV)', () => {
    expect(encryptCredential('4821')).not.toEqual(encryptCredential('4821'));
  });

  it('throws when the encryption key is not configured', () => {
    delete process.env.CREDENTIALS_ENCRYPTION_KEY;
    expect(() => encryptCredential('4821')).toThrow('CREDENTIALS_ENCRYPTION_KEY must be set');
    process.env.CREDENTIALS_ENCRYPTION_KEY = 'test-only-secret';
  });
});
