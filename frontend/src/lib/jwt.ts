import { jwtDecode } from 'jwt-decode';
import type { Role } from '@/api/types';

export interface AccessTokenPayload {
  sub: string;
  role: Role;
  profileId: string | null;
}

export function decodeAccessToken(token: string): AccessTokenPayload {
  return jwtDecode<AccessTokenPayload>(token);
}
