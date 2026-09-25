import { Test, TestingModule } from '@nestjs/testing';
import { IeltsService } from './ielts.service';

describe('IeltsService', () => {
  let service: IeltsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [IeltsService],
    }).compile();

    service = module.get<IeltsService>(IeltsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
