import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/jwt-payload.interface';
import { SubmissionsService } from './submissions.service';
import { SubmitAnswersDto } from './dto/submit-answers.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.STUDENT)
@Controller('tasks/:taskId/submit')
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Post()
  submit(@CurrentUser() user: JwtPayload, @Param('taskId') taskId: string, @Body() dto: SubmitAnswersDto) {
    return this.submissionsService.submit(user.profileId!, taskId, dto);
  }
}
