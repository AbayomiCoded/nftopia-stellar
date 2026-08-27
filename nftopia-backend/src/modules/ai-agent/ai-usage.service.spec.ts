import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { ForbiddenException } from '@nestjs/common';
import { AiUsageService } from './ai-usage.service';
import { AiUsageRecord } from './entities/ai-usage-record.entity';

describe('AiUsageService', () => {
  let service: AiUsageService;

  const queryBuilder = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getRawOne: jest.fn(),
  };

  const usageRepo = {
    create: jest.fn((data: Partial<AiUsageRecord>) => data as AiUsageRecord),
    save: jest.fn(),
    createQueryBuilder: jest.fn(() => queryBuilder),
  };

  const config = {
    get: jest.fn(),
  };

  const buildService = async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        AiUsageService,
        { provide: getRepositoryToken(AiUsageRecord), useValue: usageRepo },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();

    return moduleRef.get(AiUsageService);
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    config.get.mockImplementation((key: string) => {
      if (key === 'AI_CHAT_DAILY_TOKEN_CAP') return 1000;
      if (key === 'AI_CHAT_MONTHLY_TOKEN_CAP') return 10000;
      return undefined;
    });
    usageRepo.save.mockResolvedValue(undefined);
    queryBuilder.getRawOne.mockResolvedValue({
      totalTokens: '0',
      estimatedCostUsd: '0',
    });

    service = await buildService();
  });

  describe('recordUsage', () => {
    it('saves a record with computed totalTokens and estimatedCostUsd', async () => {
      await service.recordUsage('user-1', 'claude-opus-5', 1_000_000, 0);

      expect(usageRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          model: 'claude-opus-5',
          inputTokens: 1_000_000,
          outputTokens: 0,
          totalTokens: 1_000_000,
          estimatedCostUsd: '5.000000',
        }),
      );
      expect(usageRepo.save).toHaveBeenCalled();
    });

    it('computes cost from both input and output tokens', async () => {
      await service.recordUsage(
        'user-1',
        'claude-opus-5',
        1_000_000,
        1_000_000,
      );

      const created = usageRepo.create.mock.calls[0][0] as AiUsageRecord;
      // (1M / 1M * $5) + (1M / 1M * $25) = $30
      expect(created.estimatedCostUsd).toBe('30.000000');
      expect(created.totalTokens).toBe(2_000_000);
    });

    it('does not throw when the repository write fails', async () => {
      usageRepo.save.mockRejectedValueOnce(new Error('db down'));

      await expect(
        service.recordUsage('user-1', 'claude-opus-5', 100, 50),
      ).resolves.toBeUndefined();
    });
  });

  describe('assertWithinCap', () => {
    it('resolves for a user under both caps', async () => {
      queryBuilder.getRawOne.mockResolvedValue({
        totalTokens: '500',
        estimatedCostUsd: '1',
      });

      await expect(service.assertWithinCap('user-1')).resolves.toBeUndefined();
    });

    it('throws ForbiddenException once daily usage reaches the daily cap', async () => {
      queryBuilder.getRawOne
        .mockResolvedValueOnce({ totalTokens: '1000', estimatedCostUsd: '5' }) // daily
        .mockResolvedValueOnce({ totalTokens: '2000', estimatedCostUsd: '10' }); // monthly

      await expect(service.assertWithinCap('user-1')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('throws ForbiddenException once monthly usage reaches the monthly cap', async () => {
      queryBuilder.getRawOne
        .mockResolvedValueOnce({ totalTokens: '100', estimatedCostUsd: '0.5' }) // daily, under cap
        .mockResolvedValueOnce({
          totalTokens: '10000',
          estimatedCostUsd: '50',
        }); // monthly, at cap

      await expect(service.assertWithinCap('user-1')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('does not throw for a user exactly one token under either cap', async () => {
      queryBuilder.getRawOne.mockResolvedValue({
        totalTokens: '999',
        estimatedCostUsd: '4.99',
      });

      await expect(service.assertWithinCap('user-1')).resolves.toBeUndefined();
    });
  });

  describe('getUsageSummary', () => {
    it('returns totals, cap, and remaining allowance for both windows', async () => {
      queryBuilder.getRawOne
        .mockResolvedValueOnce({ totalTokens: '300', estimatedCostUsd: '1.5' }) // daily
        .mockResolvedValueOnce({ totalTokens: '4000', estimatedCostUsd: '20' }); // monthly

      const summary = await service.getUsageSummary('user-1');

      expect(summary.daily).toEqual({
        totalTokens: 300,
        estimatedCostUsd: 1.5,
        cap: 1000,
        remaining: 700,
      });
      expect(summary.monthly).toEqual({
        totalTokens: 4000,
        estimatedCostUsd: 20,
        cap: 10000,
        remaining: 6000,
      });
    });

    it('clamps remaining to zero when usage exceeds the cap', async () => {
      queryBuilder.getRawOne.mockResolvedValue({
        totalTokens: '5000',
        estimatedCostUsd: '25',
      });

      const summary = await service.getUsageSummary('user-1');

      expect(summary.daily.remaining).toBe(0);
    });
  });

  describe('default caps', () => {
    it('falls back to sane defaults when env vars are not configured', async () => {
      config.get.mockReturnValue(undefined);
      const defaultService = await buildService();

      queryBuilder.getRawOne.mockResolvedValue({
        totalTokens: '0',
        estimatedCostUsd: '0',
      });

      const summary = await defaultService.getUsageSummary('user-1');

      expect(summary.daily.cap).toBe(200_000);
      expect(summary.monthly.cap).toBe(2_000_000);
    });
  });
});
