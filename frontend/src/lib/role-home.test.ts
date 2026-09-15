import { describe, expect, it } from 'vitest';
import { roleHome } from './role-home';

describe('roleHome', () => {
  it.each([
    ['SUPER_ADMIN', '/super-admin/teachers'],
    ['TEACHER', '/teacher/groups'],
    ['STUDENT', '/student/tasks'],
  ] as const)('maps %s to %s', (role, expected) => {
    expect(roleHome(role)).toBe(expected);
  });
});
