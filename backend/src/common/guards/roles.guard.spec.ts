import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { RolesGuard } from './roles.guard';

function buildContext(role: Role | undefined) {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user: role ? { role } : undefined }) }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  it('denies access when the user role is not in the required list', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue([Role.TEACHER]) } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(buildContext(Role.STUDENT))).toBe(false);
  });

  it('allows access when the user role is in the required list', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue([Role.TEACHER]) } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(buildContext(Role.TEACHER))).toBe(true);
  });
});
