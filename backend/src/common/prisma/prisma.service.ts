import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    const dbUrl =
      process.env.DATABASE_URL ||
      process.env.DATABASE_POSTGRES_PRISMA_URL ||
      process.env.DATABASE_POSTGRES_URL ||
      process.env.DATABASE_POSTGRES_URL_NON_POOLING ||
      process.env.POSTGRES_PRISMA_URL ||
      process.env.POSTGRES_URL;

    if (dbUrl && !process.env.DATABASE_URL) {
      process.env.DATABASE_URL = dbUrl;
    }

    super(dbUrl ? { datasources: { db: { url: dbUrl } } } : undefined);
  }

  async onModuleInit() {
    try {
      await this.$connect();
      console.log('Successfully connected to database.');
    } catch (err) {
      console.warn('Database connection warning:', err);
    }
  }
}
