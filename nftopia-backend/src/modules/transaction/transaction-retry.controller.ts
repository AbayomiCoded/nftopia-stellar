import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TransactionRetryQueueService } from './transaction-retry-queue.service';
import { TransactionRetry } from './entities/transaction-retry.entity';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { TransactionRetryStatus } from './interfaces/transaction-retry.interface';
import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for querying retry entries
 */
export class RetryQueryDto {
  @IsOptional()
  @IsString()
  status?: TransactionRetryStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

/**
 * DTO for retrying a DLQ entry
 */
export class RetryDlqDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

/**
 * Controller for managing transaction retries
 * Provides admin endpoints for monitoring and manual intervention
 */
@Controller('transaction-retry')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TransactionRetryController {
  constructor(
    private readonly retryQueueService: TransactionRetryQueueService,
  ) {}

  /**
   * Get retry metrics
   */
  @Get('metrics')
  @Roles(UserRole.ADMIN)
  async getMetrics() {
    return this.retryQueueService.getMetrics();
  }

  /**
   * Get DLQ entries with pagination
   */
  @Get('dlq')
  @Roles(UserRole.ADMIN)
  async getDlqEntries(@Query() query: RetryQueryDto) {
    const [data, total] = await this.retryQueueService.getDlqEntries(
      query.limit || 20,
      ((query.page || 1) - 1) * (query.limit || 20),
    );
    return {
      data,
      page: query.page || 1,
      limit: query.limit || 20,
      total,
    };
  }

  /**
   * Retry a specific DLQ entry
   */
  @Post('dlq/:retryId/retry')
  @Roles(UserRole.ADMIN)
  async retryDlqEntry(
    @Param('retryId') retryId: string,
    @Body() dto: RetryDlqDto,
  ) {
    const result = await this.retryQueueService.retryDlqEntry(retryId);
    return {
      message: 'DLQ entry re-enqueued for retry',
      reason: dto.reason,
      data: result,
    };
  }

  /**
   * Get retry status for a specific retry ID
   */
  @Get(':retryId')
  @Roles(UserRole.ADMIN)
  async getRetryStatus(@Param('retryId') retryId: string) {
    const result = await this.retryQueueService.getRetryStatus(retryId);
    if (!result) {
      return {
        statusCode: HttpStatus.NOT_FOUND,
        message: `Retry ${retryId} not found`,
      };
    }
    return result;
  }

  /**
   * Get all retries for a specific transaction
   */
  @Get('transaction/:transactionId')
  @Roles(UserRole.ADMIN)
  async getRetriesForTransaction(
    @Param('transactionId') transactionId: string,
  ) {
    const results = await this.retryQueueService.getRetriesForTransaction(
      parseInt(transactionId, 10),
    );
    return results;
  }

  /**
   * Cancel a pending retry
   */
  @Delete(':retryId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.ADMIN)
  async cancelRetry(@Param('retryId') retryId: string) {
    await this.retryQueueService.cancelRetry(retryId);
  }

  /**
   * Bulk retry all DLQ entries
   */
  @Post('dlq/bulk-retry')
  @Roles(UserRole.ADMIN)
  async bulkRetryDlq(@Body() body: { limit?: number }) {
    const limit = body.limit || 50;
    const [dlqEntries] = await this.retryQueueService.getDlqEntries(limit, 0);

    const results: Array<{
      retryId: string;
      success: boolean;
      data?: TransactionRetry;
      error?: string;
    }> = [];
    for (const entry of dlqEntries) {
      try {
        const result = await this.retryQueueService.retryDlqEntry(
          entry.retryId,
        );
        results.push({
          retryId: entry.retryId,
          success: true,
          data: result,
        });
      } catch (error) {
        results.push({
          retryId: entry.retryId,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return {
      message: `Bulk retry initiated for ${results.length} DLQ entries`,
      results,
    };
  }

  /**
   * Clear all completed retries older than a specified number of days
   */
  @Delete('cleanup/:days')
  @Roles(UserRole.ADMIN)
  cleanupRetries(@Param('days') days: string) {
    const daysNum = parseInt(days, 10);
    if (isNaN(daysNum) || daysNum < 1) {
      throw new Error('Days must be a positive number');
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysNum);

    // This would need to be implemented in the service
    // For now, we'll return a message
    return {
      message: `Cleanup for retries older than ${daysNum} days`,
      // Implementation would be added here
    };
  }
}
