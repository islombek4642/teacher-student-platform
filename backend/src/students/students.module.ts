import { Module } from '@nestjs/common';
import { GroupsModule } from '../groups/groups.module';
import { StudentsController } from './students.controller';
import { StudentDetailController } from './student-detail.controller';
import { StudentsService } from './students.service';

@Module({
  imports: [GroupsModule],
  controllers: [StudentsController, StudentDetailController],
  providers: [StudentsService],
})
export class StudentsModule {}
