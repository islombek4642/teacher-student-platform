import { IsArray, IsInt, IsNotEmpty, IsNumber, IsOptional, Max, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubmitIeltsTaskDto {
  @ApiProperty({ description: 'Number of correct answers', example: 34, minimum: 0, maximum: 40 })
  @IsInt()
  @Min(0)
  @Max(40)
  score!: number;

  @ApiPropertyOptional({ description: 'Total question count', example: 40, default: 40 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(40)
  total?: number;

  @ApiProperty({ description: 'IELTS Band Score (0.0 to 9.0)', example: 7.5, minimum: 0, maximum: 9 })
  @IsNumber()
  @Min(0)
  @Max(9)
  band!: number;

  @ApiProperty({ description: 'Array of detailed per-question results', type: Array })
  @IsArray()
  @IsNotEmpty()
  results!: Array<{
    question: string | number;
    userAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
  }>;
}
