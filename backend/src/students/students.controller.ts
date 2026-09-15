import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/jwt-payload.interface';
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.TEACHER)
@Controller('groups/:groupId/students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Post()
  create(@CurrentUser() user: JwtPayload, @Param('groupId') groupId: string, @Body() dto: CreateStudentDto) {
    return this.studentsService.create(user.profileId!, groupId, dto);
  }

  @Get()
  findAll(@CurrentUser() user: JwtPayload, @Param('groupId') groupId: string) {
    return this.studentsService.findAllInGroup(user.profileId!, groupId);
  }
}
