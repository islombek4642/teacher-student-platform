import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/jwt-payload.interface';
import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.TEACHER)
@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateGroupDto) {
    return this.groupsService.create(user.profileId!, dto);
  }

  @Get()
  findAll(@CurrentUser() user: JwtPayload) {
    return this.groupsService.findAllForTeacher(user.profileId!);
  }

  @Patch(':id')
  rename(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: UpdateGroupDto) {
    return this.groupsService.rename(user.profileId!, id, dto.name);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.groupsService.remove(user.profileId!, id);
  }
}
