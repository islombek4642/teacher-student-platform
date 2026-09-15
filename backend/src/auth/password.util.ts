import { randomInt } from 'crypto';
import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

export function generateFourDigitPassword(): string {
  return randomInt(0, 10000).toString().padStart(4, '0');
}

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export function comparePassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
