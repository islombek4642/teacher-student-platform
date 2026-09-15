import { Module } from '@nestjs/common';
import { GroupsModule } from '../groups/groups.module';
import { TasksModule } from '../tasks/tasks.module';
import { StatisticsController } from './statistics.controller';
import { StatisticsService } from './statistics.service';

@Module({
  imports: [GroupsModule, TasksModule],
  controllers: [StatisticsController],
  providers: [StatisticsService],
})
export class StatisticsModule {}
