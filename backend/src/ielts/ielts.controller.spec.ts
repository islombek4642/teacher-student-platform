import { Test, TestingModule } from '@nestjs/testing';
import { IeltsController } from './ielts.controller';

describe('IeltsController', () => {
  let controller: IeltsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IeltsController],
    }).compile();

    controller = module.get<IeltsController>(IeltsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
