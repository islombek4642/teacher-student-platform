import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({ example: 'oldPassword123' })
  @IsString()
  @MinLength(1)
  currentPassword!: string;

  @ApiProperty({ example: 'newPassword123' })
  @IsString()
  @MinLength(4)
  newPassword!: string;
}

export class UpdateProfileDto {
  @ApiProperty({ example: 'Ali' })
  @IsString()
  @MinLength(1)
  firstName!: string;

  @ApiProperty({ example: 'Valiyev' })
  @IsString()
  @MinLength(1)
  lastName!: string;
}
