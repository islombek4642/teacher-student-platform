import { IsArray, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class AnswerEntryDto {
  @IsString()
  questionId!: string;

  @IsString()
  answer!: string;
}

export class SubmitAnswersDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnswerEntryDto)
  answers!: AnswerEntryDto[];
}
