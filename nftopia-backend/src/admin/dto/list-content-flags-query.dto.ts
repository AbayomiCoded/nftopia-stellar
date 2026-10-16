import { IsIn, IsNumber, IsOptional } from 'class-validator';
import type { ContentFlagEntityType, ContentFlagStatus } from '../../modules/ai-agent/entities/content-flag.entity';

export class ListContentFlagsQueryDto {
  @IsOptional()
  @IsIn(['pending', 'reviewed', 'dismissed'])
  status?: ContentFlagStatus;

  @IsOptional()
  @IsIn(['listing', 'nft', 'collection'])
  entityType?: ContentFlagEntityType;

  @IsOptional()
  @IsNumber()
  limit?: number;

  @IsOptional()
  @IsNumber()
  offset?: number;
}
