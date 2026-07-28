import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsString,
  Min,
} from 'class-validator';
import { TransactionState } from '../enums/transaction-state.enum';
import { Type } from 'class-transformer';

export class TransactionQueryDto {
  @IsOptional()
  @IsEnum(TransactionState)
  state?: TransactionState;

  @IsOptional()
  @IsString()
  nftId?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeRetries?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeDlq?: boolean;
}
