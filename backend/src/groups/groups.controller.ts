import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, UseGuards, UseInterceptors, UploadedFile, Res } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
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

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  importGroupsExcel(@CurrentUser() user: JwtPayload, @UploadedFile() file: Express.Multer.File) {
    return this.groupsService.importGroupsExcel(user.profileId!, file.buffer);
  }

  @Get('export')
  async exportGroupsExcel(@CurrentUser() user: JwtPayload, @Res() res: Response) {
    const buffer = await this.groupsService.exportGroupsExcel(user.profileId!);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="guruhlar.xlsx"',
    });
    res.send(buffer);
  }

  @Post(':id/import')
  @UseInterceptors(FileInterceptor('file'))
  importSingleGroupExcel(@CurrentUser() user: JwtPayload, @Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    return this.groupsService.importSingleGroupExcel(user.profileId!, id, file.buffer);
  }

  @Get(':id/export')
  async exportSingleGroupExcel(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Res() res: Response) {
    const buffer = await this.groupsService.exportSingleGroupExcel(user.profileId!, id);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="guruh_oquvchilar.xlsx"`,
    });
    res.send(buffer);
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
