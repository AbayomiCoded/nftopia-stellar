import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { AiUsageRecord } from './entities/ai-usage-record.entity';
import { estimateCostUsd } from './ai-usage-pricing';

export interface UsageWindow {
  totalTokens: number;
  estimatedCostUsd: number;
  cap: number;
  remaining: number;
}

export interface UsageSummary {
  daily: UsageWindow;
  monthly: UsageWindow;
}

interface UsageAggregate {
  totalTokens: number;
  estimatedCostUsd: number;
}

/**
 * Tracks per-user AI token spend and enforces daily/monthly caps.
 * "Daily" and "monthly" are calendar windows in UTC (since midnight / since
 * the 1st of the month), not rolling windows.
 */
@Injectable()
export class AiUsageService {
  private readonly logger = new Logger(AiUsageService.name);
  private readonly dailyCap: number;
  private readonly monthlyCap: number;

  constructor(
    @InjectRepository(AiUsageRecord)
    private readonly usageRepo: Repository<AiUsageRecord>,
    private readonly config: ConfigService,
  ) {
    this.dailyCap = Number(
      this.config.get('AI_CHAT_DAILY_TOKEN_CAP') ?? 200_000,
    );
    this.monthlyCap = Number(
      this.config.get('AI_CHAT_MONTHLY_TOKEN_CAP') ?? 2_000_000,
    );
  }

  /**
   * Persists token usage for a completed /ai/chat call. Never throws —
   * failures are logged so a usage-recording problem can't fail an
   * otherwise-successful chat reply. Callers should not await this on the
   * response path.
   */
  async recordUsage(
    userId: string,
    model: string,
    inputTokens: number,
    outputTokens: number,
  ): Promise<void> {
    try {
      const totalTokens = inputTokens + outputTokens;
      const estimatedCostUsd = estimateCostUsd(
        model,
        inputTokens,
        outputTokens,
      );

      await this.usageRepo.save(
        this.usageRepo.create({
          userId,
          model,
          inputTokens,
          outputTokens,
          totalTokens,
          estimatedCostUsd: estimatedCostUsd.toFixed(6),
        }),
      );
    } catch (err) {
      this.logger.error(
        `Failed to record AI usage for user ${userId}: ${(err as Error).message}`,
      );
    }
  }

  /**
   * Throws ForbiddenException if the user's current-day or current-month
   * token usage has already reached its configured cap. Call before
   * invoking the Anthropic API.
   */
  async assertWithinCap(userId: string): Promise<void> {
    const [daily, monthly] = await Promise.all([
      this.aggregate(userId, this.startOfDay()),
      this.aggregate(userId, this.startOfMonth()),
    ]);

    if (daily.totalTokens >= this.dailyCap) {
      throw new ForbiddenException(
        `Daily AI usage cap reached (${this.dailyCap} tokens). Please try again tomorrow.`,
      );
    }
    if (monthly.totalTokens >= this.monthlyCap) {
      throw new ForbiddenException(
        `Monthly AI usage cap reached (${this.monthlyCap} tokens). Please try again next month.`,
      );
    }
  }

  async getUsageSummary(userId: string): Promise<UsageSummary> {
    const [daily, monthly] = await Promise.all([
      this.aggregate(userId, this.startOfDay()),
      this.aggregate(userId, this.startOfMonth()),
    ]);

    return {
      daily: {
        ...daily,
        cap: this.dailyCap,
        remaining: this.remaining(daily.totalTokens, this.dailyCap),
      },
      monthly: {
        ...monthly,
        cap: this.monthlyCap,
        remaining: this.remaining(monthly.totalTokens, this.monthlyCap),
      },
    };
  }

  private remaining(used: number, cap: number): number {
    return Math.max(0, cap - used);
  }

  private async aggregate(
    userId: string,
    since: Date,
  ): Promise<UsageAggregate> {
    const result = await this.usageRepo
      .createQueryBuilder('r')
      .select('COALESCE(SUM(r.totalTokens), 0)', 'totalTokens')
      .addSelect('COALESCE(SUM(r.estimatedCostUsd), 0)', 'estimatedCostUsd')
      .where('r.userId = :userId', { userId })
      .andWhere('r.createdAt >= :since', { since })
      .getRawOne<{ totalTokens: string; estimatedCostUsd: string }>();

    return {
      totalTokens: Number(result?.totalTokens ?? 0),
      estimatedCostUsd: Number(result?.estimatedCostUsd ?? 0),
    };
  }

  private startOfDay(): Date {
    const now = new Date();
    return new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
  }

  private startOfMonth(): Date {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  }
}
