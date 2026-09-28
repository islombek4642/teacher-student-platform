import type { Role } from '@/api/types';

const HOME_BY_ROLE: Record<Role, string> = {
  SUPER_ADMIN: '/super-admin/teachers',
  TEACHER: '/teacher',
  STUDENT: '/student',
};

export function roleHome(role: Role): string {
  return HOME_BY_ROLE[role];
}
