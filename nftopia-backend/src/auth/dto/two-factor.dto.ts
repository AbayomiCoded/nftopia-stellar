import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length, MaxLength } from 'class-validator';

export class EnableTwoFactorDto {
  @ApiPropertyOptional({
    example: 'NFTopia',
    description: 'Issuer name to display in the authenticator app',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  issuer?: string;
}

export class VerifyTwoFactorDto {
  @ApiProperty({
    example: '123456',
    description: 'TOTP code from the authenticator app',
  })
  @IsString()
  @Length(6, 6)
  code: string;
}

export class DisableTwoFactorDto {
  @ApiProperty({
    example: '123456',
    description: 'TOTP code from the authenticator app',
  })
  @IsString()
  @Length(6, 6)
  code: string;
}

export class RecoverTwoFactorDto {
  @ApiProperty({
    example: 'ABCD-EFGH-IJKL-MNOP',
    description: 'One of the unused backup codes',
  })
  @IsString()
  @MaxLength(50)
  backupCode: string;
}

export class RegenerateBackupCodesDto {
  @ApiProperty({
    example: '123456',
    description: 'TOTP code from the authenticator app',
  })
  @IsString()
  @Length(6, 6)
  code: string;
}

export class TwoFactorChallengeDto {
  @ApiProperty({
    description: 'Temporary token issued after password/wallet verification',
  })
  @IsString()
  tempToken: string;

  @ApiProperty({
    example: '123456',
    description: 'TOTP code from the authenticator app',
  })
  @IsString()
  @Length(6, 6)
  code: string;
}

export class TwoFactorRecoveryDto {
  @ApiProperty({
    description: 'Temporary token issued after password/wallet verification',
  })
  @IsString()
  tempToken: string;

  @ApiProperty({
    example: 'ABCD-EFGH-IJKL-MNOP',
    description: 'One of the unused backup codes',
  })
  @IsString()
  @MaxLength(50)
  backupCode: string;
}

export class TwoFactorEnableResponseDto {
  @ApiProperty({ description: 'Base32-encoded TOTP secret' })
  secret: string;

  @ApiProperty({ description: 'QR code as a data URL for scanning' })
  qrCode: string;

  @ApiProperty({ description: 'otpauth:// URL encoded in the QR code' })
  otpauthUrl: string;

  @ApiProperty({
    description: 'One-time backup codes for account recovery',
    type: [String],
  })
  backupCodes: string[];
}

export class TwoFactorStatusResponseDto {
  @ApiProperty({ description: 'Whether 2FA is enabled for the user' })
  enabled: boolean;

  @ApiPropertyOptional({ description: 'When 2FA was enabled' })
  enabledAt?: Date;

  @ApiProperty({ description: 'Number of unused backup codes remaining' })
  backupCodesRemaining: number;
}
