import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  it('connects and disconnects without throwing', async () => {
    const service = new PrismaService();
    await expect(service.onModuleInit()).resolves.not.toThrow();
    await service.$disconnect();
  });
});
