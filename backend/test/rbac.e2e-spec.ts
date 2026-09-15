import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { createTestApp, resetDatabase } from './utils/test-app';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { hashPassword } from '../src/auth/password.util';

const PLACEHOLDER = 'placeholder-id';

interface RouteCase {
  method: 'post' | 'get';
  path: string;
  allowedRole: Role;
}

const ROUTES: RouteCase[] = [
  { method: 'post', path: '/groups', allowedRole: Role.TEACHER },
  { method: 'get', path: '/groups', allowedRole: Role.TEACHER },
  { method: 'post', path: `/groups/${PLACEHOLDER}/students`, allowedRole: Role.TEACHER },
  { method: 'get', path: `/groups/${PLACEHOLDER}/students`, allowedRole: Role.TEACHER },
  { method: 'post', path: '/teachers', allowedRole: Role.SUPER_ADMIN },
  { method: 'get', path: '/teachers', allowedRole: Role.SUPER_ADMIN },
  { method: 'post', path: '/tasks', allowedRole: Role.TEACHER },
  { method: 'get', path: `/groups/${PLACEHOLDER}/tasks`, allowedRole: Role.TEACHER },
  { method: 'get', path: '/tasks/assigned', allowedRole: Role.STUDENT },
  { method: 'post', path: `/tasks/${PLACEHOLDER}/submit`, allowedRole: Role.STUDENT },
  { method: 'get', path: `/groups/${PLACEHOLDER}/statistics/overview`, allowedRole: Role.TEACHER },
  { method: 'get', path: `/groups/${PLACEHOLDER}/statistics/leaderboard`, allowedRole: Role.TEACHER },
  { method: 'get', path: `/tasks/${PLACEHOLDER}/statistics`, allowedRole: Role.TEACHER },
  { method: 'get', path: '/statistics/me', allowedRole: Role.STUDENT },
];

// For a TEACHER-only route, probe with STUDENT; for a STUDENT-only route, probe with
// TEACHER; for a SUPER_ADMIN-only route, probe with TEACHER.
function wrongRoleFor(role: Role): Role {
  if (role === Role.TEACHER) return Role.STUDENT;
  return Role.TEACHER;
}

describe('RBAC (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tokens: Record<Role, string>;

  beforeAll(async () => {
    const testApp = await createTestApp();
    app = testApp.app;
    prisma = testApp.prisma;
    const jwtService = app.get(JwtService);

    const passwordHash = await hashPassword('0000');
    const admin = await prisma.user.create({
      data: { username: 'rbac-admin', passwordHash, role: Role.SUPER_ADMIN },
    });
    const teacherUser = await prisma.user.create({
      data: { username: 'rbac-teacher', passwordHash, role: Role.TEACHER },
    });
    const teacherProfile = await prisma.teacherProfile.create({
      data: { userId: teacherUser.id, firstName: 'T', lastName: 'R' },
    });
    const group = await prisma.group.create({ data: { name: 'RBAC Group', teacherId: teacherProfile.id } });
    const studentUser = await prisma.user.create({
      data: { username: 'rbac-student', passwordHash, role: Role.STUDENT },
    });
    const studentProfile = await prisma.studentProfile.create({
      data: { userId: studentUser.id, firstName: 'S', lastName: 'R', groupId: group.id },
    });

    tokens = {
      [Role.SUPER_ADMIN]: jwtService.sign({ sub: admin.id, role: Role.SUPER_ADMIN, profileId: null }),
      [Role.TEACHER]: jwtService.sign({ sub: teacherUser.id, role: Role.TEACHER, profileId: teacherProfile.id }),
      [Role.STUDENT]: jwtService.sign({ sub: studentUser.id, role: Role.STUDENT, profileId: studentProfile.id }),
    };
  });

  afterAll(async () => {
    await resetDatabase(prisma);
    await app.close();
  });

  describe.each(ROUTES)('$method $path (allowed: $allowedRole)', ({ method, path, allowedRole }) => {
    it('rejects a request with no Authorization header with 401', async () => {
      const response = await request(app.getHttpServer())[method](path).send({});
      expect(response.status).toBe(401);
    });

    it('rejects a request from a role that is not allowed with 403', async () => {
      const token = tokens[wrongRoleFor(allowedRole)];
      const response = await request(app.getHttpServer())
        [method](path)
        .set('Authorization', `Bearer ${token}`)
        .send({});
      expect(response.status).toBe(403);
    });
  });
});
