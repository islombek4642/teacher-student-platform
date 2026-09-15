import { IsString, MinLength } from 'class-validator';

export class CreateTeacherDto {
  @IsString()
  @MinLength(3)
  username!: string;

  @IsString()
  @MinLength(1)
  firstName!: string;

  @IsString()
  @MinLength(1)
  lastName!: string;
}
