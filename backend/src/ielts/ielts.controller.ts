import {
  Controller,
  Post,
  Patch,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Body,
  Get,
  Param,
  Res,
  Delete,
  Query,
} from '@nestjs/common';
import { IeltsService } from './ielts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role, IeltsTaskType } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/jwt-payload.interface';
import { Response } from 'express';
import { GradeSubmissionDto } from './dto/grade-submission.dto';
import { GradeSpeakingSubmissionDto } from './dto/grade-speaking-submission.dto';
import { CreateSpeakingTaskDto } from './dto/create-speaking-task.dto';
import { ApiBearerAuth, ApiTags, ApiConsumes, ApiBody } from '@nestjs/swagger';

@ApiTags('ielts')
@ApiBearerAuth()
@Controller('ielts')
export class IeltsController {
  constructor(private readonly ieltsService: IeltsService) {}

  @Post('upload')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TEACHER, Role.SUPER_ADMIN)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
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
    return this.ieltsService.uploadTask(user, title, type, file, groupId);
  }

  @Get('group/:groupId')
  @UseGuards(JwtAuthGuard)
  async getTasksByGroup(@Param('groupId') groupId: string) {
    return this.ieltsService.getTasksByGroup(groupId);
  }

  @Get('teacher')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TEACHER, Role.SUPER_ADMIN)
  async getTeacherTasks(@CurrentUser() user: JwtPayload) {
    if (user.role === Role.SUPER_ADMIN) {
      return this.ieltsService.getAllTasks();
    }
    return this.ieltsService.getTasksForTeacherUser(user.sub);
  }

  @Get('student')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT)
  async getStudentTasks(@CurrentUser() user: JwtPayload) {
    return this.ieltsService.getTasksByStudent(user.sub);
  }

  @Get('my-submissions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT)
  async getMySubmissions(@CurrentUser() user: JwtPayload) {
    return this.ieltsService.getMySubmissions(user);
  }

  @Get('submissions/to-grade')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TEACHER, Role.SUPER_ADMIN)
  async getSubmissionsToGrade(
    @CurrentUser() user: JwtPayload,
    @Query('taskId') taskId?: string,
    @Query('type') type?: IeltsTaskType,
  ) {
    return this.ieltsService.getSubmissionsToGrade(user, taskId, type);
  }

  @Get('submissions/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TEACHER, Role.SUPER_ADMIN, Role.STUDENT)
  async getSubmissionById(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.ieltsService.getSubmissionById(user, id);
  }

  @Patch('submissions/:id/grade')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TEACHER, Role.SUPER_ADMIN)
  async gradeSubmission(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: GradeSubmissionDto,
  ) {
    return this.ieltsService.gradeSubmission(user, id, dto);
  }

  @Patch('submissions/:id/grade-speaking')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TEACHER, Role.SUPER_ADMIN)
  async gradeSpeakingSubmission(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: GradeSpeakingSubmissionDto,
  ) {
    return this.ieltsService.gradeSpeakingSubmission(user, id, dto);
  }

  @Post('speaking/upload-audio')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT, Role.TEACHER, Role.SUPER_ADMIN)
  @UseInterceptors(FileInterceptor('audio', { limits: { fileSize: 25 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  async uploadSpeakingAudio(@UploadedFile() file: Express.Multer.File) {
    return this.ieltsService.saveSpeakingAudio(file);
  }

  @Get('speaking/audio/:filename')
  async getSpeakingAudio(
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    const { stream, mimeType } = await this.ieltsService.getSpeakingAudioStream(filename);
    res.setHeader('Content-Type', mimeType);
    stream.pipe(res);
  }

  @Post('speaking/create')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TEACHER, Role.SUPER_ADMIN)
  async createSpeakingTask(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateSpeakingTaskDto,
  ) {
    return this.ieltsService.createSpeakingTask(user, dto);
  }

  @Post(':id/submit')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT)
  async submitTask(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: any,
  ) {
    return this.ieltsService.submitTask(user, id, dto);
  }

  @Get(':id/my-submission')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT)
  async getMySubmission(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.ieltsService.getMySubmission(user, id);
  }

  @Get(':id/attempts')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT, Role.TEACHER, Role.SUPER_ADMIN)
  async getTaskAttempts(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.ieltsService.getTaskAttempts(user, id);
  }

  @Get(':id/view')
  async viewTask(
    @Param('id') id: string,
    @Query('mode') mode: string,
    @Query('preview') preview: string,
    @Query('submissionId') submissionId: string,
    @Res() res: Response,
  ) {
    const isPreview = preview === 'true' || preview === '1' || mode === 'review';
    const task = await this.ieltsService.getTask(id, mode, isPreview, submissionId);
    res.setHeader('Content-Type', 'text/html');
    res.send(task.contentHtml);
  }

  @Post('bulk-delete')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TEACHER, Role.SUPER_ADMIN)
  async deleteTasks(
    @Body('taskIds') taskIds: string[],
    @CurrentUser() user: JwtPayload,
  ) {
    return this.ieltsService.deleteTasks(taskIds, user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TEACHER, Role.SUPER_ADMIN)
  async deleteTask(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.ieltsService.deleteTask(id, user);
  }
}
