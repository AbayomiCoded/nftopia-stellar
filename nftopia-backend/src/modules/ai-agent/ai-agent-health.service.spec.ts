// Anthropic() reads ANTHROPIC_API_KEY at construction time — see
// ai-agent.service.spec.ts for why this must be set before import (the
// tests below override/restore it per-case around the actual check).
process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';

import { AiAgentHealthService } from './ai-agent-health.service';

describe('AiAgentHealthService', () => {
  let service: AiAgentHealthService;
  let originalApiKey: string | undefined;

  const mockRetrieve = (impl: jest.Mock) => {
    const client = (service as unknown as { client: unknown }).client as {
      models: { retrieve: jest.Mock };
    };
    client.models.retrieve = impl;
    return impl;
  };

  beforeEach(() => {
    originalApiKey = process.env.ANTHROPIC_API_KEY;
    process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
    service = new AiAgentHealthService();
  });

  afterEach(() => {
    if (originalApiKey === undefined) {
      delete process.env.ANTHROPIC_API_KEY;
    } else {
      process.env.ANTHROPIC_API_KEY = originalApiKey;
    }
  });

  describe('unconfigured', () => {
    it('returns "unconfigured" when ANTHROPIC_API_KEY is unset', async () => {
      delete process.env.ANTHROPIC_API_KEY;
      const retrieve = mockRetrieve(jest.fn());

      const status = await service.checkAnthropic();

      expect(status).toBe('unconfigured');
      expect(retrieve).not.toHaveBeenCalled();
    });

    it('returns "unconfigured" when ANTHROPIC_API_KEY is an empty string', async () => {
      process.env.ANTHROPIC_API_KEY = '';
      const retrieve = mockRetrieve(jest.fn());

      const status = await service.checkAnthropic();

      expect(status).toBe('unconfigured');
      expect(retrieve).not.toHaveBeenCalled();
    });

    it('does not throw', async () => {
      delete process.env.ANTHROPIC_API_KEY;
      await expect(service.checkAnthropic()).resolves.toBe('unconfigured');
    });
  });

  describe('up', () => {
    it('returns "up" when the models.retrieve call succeeds', async () => {
      mockRetrieve(jest.fn().mockResolvedValue({ id: 'claude-opus-5' }));

      const status = await service.checkAnthropic();

      expect(status).toBe('up');
    });

    it('calls models.retrieve with a model id, no billed params, and a short timeout', async () => {
      const retrieve = mockRetrieve(
        jest.fn().mockResolvedValue({ id: 'claude-opus-5' }),
      );

      await service.checkAnthropic();

      expect(retrieve).toHaveBeenCalledWith('claude-opus-5', null, {
        timeout: 5000,
      });
    });
  });

  describe('down', () => {
    it('returns "down" when models.retrieve rejects', async () => {
      mockRetrieve(jest.fn().mockRejectedValue(new Error('network error')));

      const status = await service.checkAnthropic();

      expect(status).toBe('down');
    });

    it('returns "down" on a timeout-shaped error without throwing', async () => {
      mockRetrieve(jest.fn().mockRejectedValue(new Error('Request timed out')));

      await expect(service.checkAnthropic()).resolves.toBe('down');
    });

    it('does not propagate the underlying error', async () => {
      mockRetrieve(jest.fn().mockRejectedValue(new Error('boom')));

      await expect(service.checkAnthropic()).resolves.not.toThrow();
    });
  });

  describe('getHealth', () => {
    it('wraps the status with an ISO timestamp', async () => {
      mockRetrieve(jest.fn().mockResolvedValue({ id: 'claude-opus-5' }));

      const health = await service.getHealth();

      expect(health.status).toBe('up');
      expect(new Date(health.timestamp).toString()).not.toBe('Invalid Date');
    });

    it('reflects "down" status from a failed check', async () => {
      mockRetrieve(jest.fn().mockRejectedValue(new Error('boom')));

      const health = await service.getHealth();

      expect(health.status).toBe('down');
    });

    it('reflects "unconfigured" status when no API key is set', async () => {
      delete process.env.ANTHROPIC_API_KEY;

      const health = await service.getHealth();

      expect(health.status).toBe('unconfigured');
    });
  });
});
