import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { QuestionType } from '@prisma/client';

@ValidatorConstraint({ name: 'multipleChoiceHasValidOptions', async: false })
class MultipleChoiceHasValidOptionsConstraint implements ValidatorConstraintInterface {
  validate(correctAnswer: string, args: ValidationArguments) {
    const dto = args.object as CreateQuestionDto;
    if (dto.type !== QuestionType.MULTIPLE_CHOICE) return true;
    return Array.isArray(dto.options) && dto.options.length >= 2 && dto.options.includes(correctAnswer);
  }

  defaultMessage() {
    return 'MULTIPLE_CHOICE questions require at least 2 options including the correct answer';
  }
}

export class CreateQuestionDto {
  @IsEnum(QuestionType)
  type!: QuestionType;

  @IsString()
  @MinLength(1)
  text!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];

  @IsString()
  @MinLength(1)
  @Validate(MultipleChoiceHasValidOptionsConstraint)
  correctAnswer!: string;
}
