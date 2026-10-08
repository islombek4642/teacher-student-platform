import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  it('connects and disconnects without throwing', async () => {
    const service = new PrismaService();
    const connectSpy = jest.spyOn(service, '$connect').mockResolvedValue(undefined as never);
    const disconnectSpy = jest.spyOn(service, '$disconnect').mockResolvedValue(undefined as never);

    await expect(service.onModuleInit()).resolves.not.toThrow();
    expect(connectSpy).toHaveBeenCalled();

    await expect(service.$disconnect()).resolves.not.toThrow();
    expect(disconnectSpy).toHaveBeenCalled();
  });

  it('handles connection error gracefully without throwing', async () => {
    const service = new PrismaService();
    jest.spyOn(service, '$connect').mockRejectedValue(new Error('Connection failed'));
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(service.onModuleInit()).resolves.not.toThrow();
    expect(warnSpy).toHaveBeenCalledWith('Database connection warning:', expect.any(Error));

    warnSpy.mockRestore();
  });
});
