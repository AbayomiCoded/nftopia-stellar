import { Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';

/** How long to wait for Anthropic to answer before treating it as down. */
const HEALTH_CHECK_TIMEOUT_MS = 5000;

/** Model used for the reachability probe — must exist so a 404 doesn't look like an outage. */
const HEALTH_CHECK_MODEL = 'claude-opus-5';

export type AnthropicHealthStatus = 'up' | 'down' | 'unconfigured';

/**
 * Reports whether the Anthropic API is currently reachable, without
 * incurring generation cost. Kept separate from AiAgentService/HealthService
 * so a probe failure here can never affect either the AI agent's own
 * request path or the overall /health/ready readiness probe.
 */
@Injectable()
export class AiAgentHealthService {
  private readonly logger = new Logger(AiAgentHealthService.name);
  private readonly client = new Anthropic();

  /**
   * Cheap reachability check: retrieves model metadata instead of sending a
   * billed generation request. Never throws — mirrors the
   * try/catch-and-return-status pattern in HealthService.checkPostgres/
   * checkRedis.
   */
  async checkAnthropic(): Promise<AnthropicHealthStatus> {
    if (!process.env.ANTHROPIC_API_KEY) {
      return 'unconfigured';
    }

    try {
      await this.client.models.retrieve(HEALTH_CHECK_MODEL, null, {
        timeout: HEALTH_CHECK_TIMEOUT_MS,
      });
      return 'up';
    } catch (error) {
      this.logger.error('Anthropic health check failed', error as Error);
      return 'down';
    }
  }

  async getHealth(): Promise<{
    status: AnthropicHealthStatus;
    timestamp: string;
  }> {
    const status = await this.checkAnthropic();
    return {
      status,
      timestamp: new Date().toISOString(),
    };
  }
}
