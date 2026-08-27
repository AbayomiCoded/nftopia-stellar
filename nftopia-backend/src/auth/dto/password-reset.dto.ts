import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RequestPasswordResetDto {
  @ApiProperty({
    example: 'builder@nftopia.io',
  })
  @IsEmail()
  @MaxLength(255)
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Password reset token from the email link',
  })
  @IsString()
  token: string;

  @ApiProperty({
    minLength: 8,
    description:
      'Password must include uppercase, lowercase, number, and symbol',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,72}$/, {
    message:
      'password must include uppercase, lowercase, number, and special character',
  })
  newPassword: string;
}
