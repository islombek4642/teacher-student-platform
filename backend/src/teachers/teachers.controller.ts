import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { TeachersService } from './teachers.service';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

@ApiTags('Teachers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
@Controller('teachers')
export class TeachersController {
  constructor(private readonly teachersService: TeachersService) {}

  @ApiOperation({ summary: 'Create a new teacher' })
  @Post()
  create(@Body() dto: CreateTeacherDto) {
    return this.teachersService.create(dto);
  }

  @ApiOperation({ summary: 'Get all teachers' })
  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.teachersService.findAll(query);
  }

  @ApiOperation({ summary: 'Activate or deactivate a teacher' })
  @Patch(':id')
  setActive(@Param('id') id: string, @Body() dto: UpdateTeacherDto) {
    return this.teachersService.setActive(id, dto.isActive);
  }

  @ApiOperation({ summary: 'Reset a teacher password' })
  @Post(':id/reset-password')
  resetPassword(@Param('id') id: string) {
    return this.teachersService.resetPassword(id);
  }

  @ApiOperation({ summary: 'Remove a teacher' })
  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string) {
    return this.teachersService.remove(id);
  }
}
