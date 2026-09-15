import { comparePassword, generateFourDigitPassword, hashPassword } from './password.util';

describe('password.util', () => {
  it('generates a zero-padded 4-digit password', () => {
    for (let i = 0; i < 50; i++) {
      const password = generateFourDigitPassword();
      expect(password).toMatch(/^\d{4}$/);
    }
  });

  it('hashes a password and verifies it correctly', async () => {
    const hash = await hashPassword('1234');
    expect(hash).not.toEqual('1234');
    await expect(comparePassword('1234', hash)).resolves.toBe(true);
    await expect(comparePassword('9999', hash)).resolves.toBe(false);
  });
});
