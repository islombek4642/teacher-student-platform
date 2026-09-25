import { Module } from '@nestjs/common';
import { IeltsController } from './ielts.controller';
import { IeltsService } from './ielts.service';

@Module({
  controllers: [IeltsController],
  providers: [IeltsService]
})
export class IeltsModule {}
