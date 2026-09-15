import { IsBoolean } from 'class-validator';

export class UpdateTeacherDto {
  @IsBoolean()
  isActive!: boolean;
}
