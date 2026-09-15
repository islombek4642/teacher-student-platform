import { describe, expect, it } from 'vitest';
import { decodeAccessToken } from './jwt';

describe('decodeAccessToken', () => {
  it('decodes sub, role, and profileId from a JWT', () => {
    // Header/payload for { sub: 'u1', role: 'TEACHER', profileId: 'p1' }, unsigned (signature irrelevant client-side)
    const token =
      'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1MSIsInJvbGUiOiJURUFDSEVSIiwicHJvZmlsZUlkIjoicDEifQ.sig';

    const payload = decodeAccessToken(token);

    expect(payload).toEqual({ sub: 'u1', role: 'TEACHER', profileId: 'p1' });
  });
});
