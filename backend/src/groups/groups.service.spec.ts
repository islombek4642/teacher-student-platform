import { NotFoundException } from '@nestjs/common';
import { GroupsService } from './groups.service';
import { PrismaService } from '../common/prisma/prisma.service';

describe('GroupsService', () => {
  it('creates a group owned by the given teacher', async () => {
    const prisma = {
      group: { create: jest.fn().mockResolvedValue({ id: 'g1', name: '9-A', teacherId: 't1' }) },
    } as unknown as PrismaService;
    const service = new GroupsService(prisma);

    const result = await service.create('t1', { name: '9-A' });

    expect(prisma.group.create).toHaveBeenCalledWith({ data: { name: '9-A', teacherId: 't1' } });
    expect(result.id).toBe('g1');
  });

  it('findOneOwned throws NotFoundException when the group belongs to another teacher', async () => {
    const prisma = {
      group: { findUnique: jest.fn().mockResolvedValue({ id: 'g1', teacherId: 'other-teacher' }) },
    } as unknown as PrismaService;
    const service = new GroupsService(prisma);

    await expect(service.findOneOwned('t1', 'g1')).rejects.toBeInstanceOf(NotFoundException);
  });
});
