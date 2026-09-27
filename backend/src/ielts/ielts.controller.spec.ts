import { Test, TestingModule } from '@nestjs/testing';
import { IeltsController } from './ielts.controller';
import { IeltsService } from './ielts.service';

describe('IeltsController', () => {
  let controller: IeltsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IeltsController],
      providers: [
        {
          provide: IeltsService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<IeltsController>(IeltsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
