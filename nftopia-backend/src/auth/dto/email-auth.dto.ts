import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class EmailRegisterDto {
  @ApiProperty({
    example: 'builder@nftopia.io',
  })
  @IsEmail()
  @MaxLength(255)
  email: string;

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
  password: string;

  @ApiPropertyOptional({
    example: 'stellarbuilder',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  username?: string;
}

export class EmailLoginDto {
  @ApiProperty({
    example: 'builder@nftopia.io',
  })
  @IsEmail()
  @MaxLength(255)
  email: string;

  @ApiProperty({
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password: string;
}

export class EmailLoginResponseDto {
  @ApiPropertyOptional({
    description: 'Temporary token if 2FA is required',
  })
  tempToken?: string;

  @ApiPropertyOptional({
    description: 'Whether 2FA is required to complete login',
  })
  requiresTwoFactor?: boolean;

  @ApiProperty({
    description: 'Access token (only if 2FA is not required)',
  })
  access_token?: string;

  @ApiProperty({
    description: 'Refresh token (only if 2FA is not required)',
  })
  refresh_token?: string;

  @ApiProperty({
    description: 'User information',
  })
  user?: {
    id: string;
    email?: string | null;
    username?: string | null;
    walletAddress?: string | null;
    walletProvider?: string | null;
    avatarUrl?: string | null;
    bannerUrl?: string | null;
  };
}
