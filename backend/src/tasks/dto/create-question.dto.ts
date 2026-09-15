import { IsArray, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { QuestionType } from '@prisma/client';

export class CreateQuestionDto {
  @IsEnum(QuestionType)
  type!: QuestionType;

  @IsString()
  @MinLength(1)
  text!: string;

  @IsOptional()
  @IsArray()
  options?: string[];

  @IsString()
  @MinLength(1)
  correctAnswer!: string;
}
