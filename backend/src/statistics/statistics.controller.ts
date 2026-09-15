import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/jwt-payload.interface';
import { StatisticsService } from './statistics.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Roles(Role.TEACHER)
  @Get('groups/:groupId/statistics/overview')
  groupOverview(@CurrentUser() user: JwtPayload, @Param('groupId') groupId: string) {
    return this.statisticsService.groupOverview(user.profileId!, groupId);
  }

  @Roles(Role.TEACHER)
  @Get('groups/:groupId/statistics/leaderboard')
  leaderboard(@CurrentUser() user: JwtPayload, @Param('groupId') groupId: string) {
    return this.statisticsService.leaderboard(user.profileId!, groupId);
  }

  @Roles(Role.TEACHER)
  @Get('tasks/:taskId/statistics')
  taskStats(@CurrentUser() user: JwtPayload, @Param('taskId') taskId: string) {
    return this.statisticsService.taskStats(user.profileId!, taskId);
  }

  @Roles(Role.STUDENT)
  @Get('statistics/me')
  myProgress(@CurrentUser() user: JwtPayload) {
    return this.statisticsService.studentProgress(user.profileId!);
  }
}
