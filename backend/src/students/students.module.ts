import { Module } from '@nestjs/common';
import { GroupsModule } from '../groups/groups.module';
import { StudentsController } from './students.controller';
import { StudentsService } from './students.service';

@Module({
  imports: [GroupsModule],
  controllers: [StudentsController],
  providers: [StudentsService],
})
export class StudentsModule {}
