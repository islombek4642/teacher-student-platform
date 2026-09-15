import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/jwt-payload.interface';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { PrismaService } from '../common/prisma/prisma.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class TasksController {
  constructor(
    private readonly tasksService: TasksService,
    private readonly prisma: PrismaService,
  ) {}

  @Roles(Role.TEACHER)
  @Post('tasks')
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateTaskDto) {
    return this.tasksService.create(user.profileId!, dto);
  }

  @Roles(Role.TEACHER)
  @Get('groups/:groupId/tasks')
  findAllForGroup(@CurrentUser() user: JwtPayload, @Param('groupId') groupId: string) {
    return this.tasksService.findAllForGroup(user.profileId!, groupId);
  }

  @Roles(Role.STUDENT)
  @Get('tasks/assigned')
  async findAssigned(@CurrentUser() user: JwtPayload) {
    const profile = await this.prisma.studentProfile.findUniqueOrThrow({ where: { id: user.profileId! } });
    return this.tasksService.findAssignedToStudent(profile.groupId);
  }
}
