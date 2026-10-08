import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GradeSpeakingSubmissionDto {
  @ApiProperty({ description: 'Fluency and Coherence (0.0 to 9.0)', example: 6.5, minimum: 0, maximum: 9 })
  @IsNumber()
  @Min(0)
  @Max(9)
  fluencyCoherence!: number;

  @ApiProperty({ description: 'Lexical Resource (0.0 to 9.0)', example: 7.0, minimum: 0, maximum: 9 })
  @IsNumber()
  @Min(0)
  @Max(9)
  lexicalResource!: number;

  @ApiProperty({ description: 'Grammatical Range and Accuracy (0.0 to 9.0)', example: 6.5, minimum: 0, maximum: 9 })
  @IsNumber()
  @Min(0)
  @Max(9)
  grammaticalAccuracy!: number;

  @ApiProperty({ description: 'Pronunciation (0.0 to 9.0)', example: 7.0, minimum: 0, maximum: 9 })
  @IsNumber()
  @Min(0)
  @Max(9)
  pronunciation!: number;

  @ApiPropertyOptional({ description: 'Overall Band Score (0.0 to 9.0). If omitted, calculated as average of the 4 criteria rounded to nearest 0.5', example: 7.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(9)
  band?: number;

  @ApiPropertyOptional({ description: 'Teacher detailed feedback and suggestions for improvement' })
  @IsOptional()
  @IsString()
  feedback?: string;
}
