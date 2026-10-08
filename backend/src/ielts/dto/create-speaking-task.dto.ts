import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSpeakingTaskDto {
  @ApiProperty({ description: 'Title of the speaking task', example: 'Speaking Test 1: Hometown and Travel' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ description: 'Structured JSON or HTML prompt content' })
  @IsString()
  @IsNotEmpty()
  contentHtml!: string;

  @ApiPropertyOptional({ description: 'Optional group ID to assign to' })
  @IsOptional()
  @IsString()
  groupId?: string;
}
