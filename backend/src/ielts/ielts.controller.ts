import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Body,
  Get,
  Param,
  Res,
  Delete,
} from '@nestjs/common';
import { IeltsService } from './ielts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role, IeltsTaskType } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/jwt-payload.interface';
import { Response } from 'express';
import { ApiTags, ApiConsumes, ApiBody, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('ielts')
@ApiBearerAuth()
@Controller('ielts')
export class IeltsController {
  constructor(private readonly ieltsService: IeltsService) {}

  @Post('upload')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TEACHER)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        groupId: { type: 'string', nullable: true },
        type: { type: 'string', enum: ['LISTENING', 'READING', 'WRITING', 'SPEAKING'] },
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async uploadTask(
    @CurrentUser() user: JwtPayload,
    @Body('title') title: string,
    @Body('type') type: IeltsTaskType,
    @UploadedFile() file: Express.Multer.File,
    @Body('groupId') groupId?: string,
  ) {
    const teacherProfile = await this.ieltsService['prisma'].teacherProfile.findUnique({
      where: { userId: user.sub },
    });
    return this.ieltsService.uploadTask(teacherProfile!.id, title, type, file, groupId);
  }

  @Get('group/:groupId')
  @UseGuards(JwtAuthGuard)
  async getTasksByGroup(@Param('groupId') groupId: string) {
    return this.ieltsService.getTasksByGroup(groupId);
  }

  @Get('teacher')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TEACHER)
  async getTeacherTasks(@CurrentUser() user: JwtPayload) {
    const teacherProfile = await this.ieltsService['prisma'].teacherProfile.findUnique({
      where: { userId: user.sub },
    });
    return this.ieltsService.getTasksByTeacher(teacherProfile!.id);
  }

  @Get(':id/view')
  // Public or guarded? If it's loaded in an iframe with the token, it should be guarded.
  // But iframe src doesn't send Authorization headers easily.
  // To keep it simple, we can make it public for now, or use a query token, or just rely on the fact that IDs are random UUIDs.
  async viewTask(@Param('id') id: string, @Res() res: Response) {
    const task = await this.ieltsService.getTask(id);
    res.setHeader('Content-Type', 'text/html');
    res.send(task.contentHtml);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TEACHER)
  async deleteTask(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    const teacherProfile = await this.ieltsService['prisma'].teacherProfile.findUnique({
      where: { userId: user.sub },
    });
    return this.ieltsService.deleteTask(id, teacherProfile!.id);
  }
}
