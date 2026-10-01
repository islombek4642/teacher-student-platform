import { Role } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  role: Role;
  profileId: string | null;
  firstName?: string | null;
  lastName?: string | null;
}
