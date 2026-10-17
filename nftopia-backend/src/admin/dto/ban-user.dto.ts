import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class BanUserDto {
  @IsNotEmpty({ message: 'Ban reason is required' })
  @IsString()
  @MaxLength(500)
  reason: string;
}
