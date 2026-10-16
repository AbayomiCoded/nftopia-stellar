import { randomUUID } from 'crypto';
import { betaZodTool } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';
import type { OrderService } from '../../order/order.service';
import type { OfferService } from '../../offer/offer.service';

/**
 * The exact tool names this builder is allowed to return — registered as
 * this set's ownership in tool-set.registry.ts (#641).
 */
export const TRADING_TOOL_NAMES = [
  'propose_trade',
  'accept_trade',
  'cancel_trade',
] as const;

export type TradingToolName = (typeof TRADING_TOOL_NAMES)[number];

export interface TradeProposalResult {
  tradeId: string;
  proposerId: string;
  offeredNftId: string;
  requestedNftId: string;
  price?: string;
  currency: string;
  status: 'PENDING' | 'PROPOSED';
  message: string;
  createdAt: string;
  order?: unknown;
}

export interface TradeActionResult {
  tradeId: string;
  action: 'ACCEPTED' | 'CANCELLED';
  userId: string;
  status: string;
  reason?: string;
  message: string;
  timestamp: string;
  order?: unknown;
}

export interface TradingToolsDeps {
  /**
   * The authenticated caller — closed over at build time so write-capable
   * trade actions are strictly scoped to the caller's own identity (#641).
   * Tool inputs can never widen or override this caller identity.
   */
  userId: string;

  /**
   * Optional OrderService to validate or execute order-backed trades.
   */
  orderService?: OrderService;

  /**
   * Optional OfferService to validate or execute offer-backed trades.
   */
  offerService?: OfferService;

  /**
   * Optional set of order/offer IDs explicitly allowed for this session/caller.
   * If provided, actions on orders outside this set are rejected by the scoping guard.
   */
  allowedOrderIds?: ReadonlySet<string> | string[];

  toolLogger?: import('./tool-set.types').ToolLogger;
}

/**
 * Write-capable tool surface for trading and trade proposals (#641).
 *
 * Scoping model:
 * 1. Proposing a trade is always bound to `deps.userId`. If the model echoes
 *    a different proposerId, the scoping guard rejects the invocation.
 * 2. Accepting or cancelling a trade enforces ownership checks: only the
 *    authenticated caller can act on their own orders/offers.
 * 3. When `allowedOrderIds` is configured, actions are restricted to that subset.
 */
export function buildTradingTools(deps: TradingToolsDeps) {
  const { userId, orderService, offerService, allowedOrderIds } = deps;

  const createTool = <T extends z.ZodTypeAny>(config: {
    name: string;
    description: string;
    inputSchema: T;
    run: (input: z.infer<T>) => Promise<string>;
  }) => {
    const originalRun = config.run;
    config.run = async (input: z.infer<T>) => {
      const start = Date.now();
      try {
        const res = await originalRun(input);
        if (deps.toolLogger) {
          const resStr = typeof res === 'string' ? res : JSON.stringify(res);
          const summary =
            resStr.substring(0, 100) + (resStr.length > 100 ? '...' : '');
          deps.toolLogger(
            config.name,
            input as Record<string, unknown>,
            summary,
            Date.now() - start,
          );
        }
        return res;
      } catch (err) {
        if (deps.toolLogger) {
          deps.toolLogger(
            config.name,
            input as Record<string, unknown>,
            `Error: ${(err as Error).message}`,
            Date.now() - start,
          );
        }
        throw err;
      }
    };
    return betaZodTool(config);
  };

  const assertCallerScope = (action: string, targetUserId?: string) => {
    if (targetUserId && targetUserId !== userId) {
      throw new Error(
        `Scoping violation: cannot ${action} for user "${targetUserId}". ` +
          `This tool set is strictly scoped to the authenticated caller "${userId}".`,
      );
    }
  };

  const assertOrderScope = (tradeId: string) => {
    if (allowedOrderIds) {
      const allowed = Array.isArray(allowedOrderIds)
        ? new Set(allowedOrderIds)
        : allowedOrderIds;
      if (!allowed.has(tradeId)) {
        throw new Error(
          `Scoping violation: trade "${tradeId}" is outside the caller's authorized orders/offers scope.`,
        );
      }
    }
  };

  const proposeTrade = createTool({
    name: 'propose_trade',
    description:
      'Propose a trade between an offered NFT and a requested NFT, with an optional sweetener price. ' +
      'Strictly scoped to the authenticated caller as the proposer; cannot propose on behalf of other users.',
    inputSchema: z.object({
      offeredNftId: z
        .string()
        .min(1)
        .describe('The id of the NFT being offered in the trade.'),
      requestedNftId: z
        .string()
        .min(1)
        .describe('The id of the NFT requested in return.'),
      price: z
        .string()
        .optional()
        .describe(
          'Optional sweetener or cash amount (in XLM or specified currency).',
        ),
      currency: z.enum(['XLM', 'USDC']).default('XLM'),
      expiresAt: z
        .string()
        .datetime()
        .optional()
        .describe('Optional ISO 8601 expiration timestamp.'),
      proposerId: z
        .string()
        .optional()
        .describe(
          'The proposer user ID. If provided, must match the authenticated caller; never trusted from model alone.',
        ),
    }),
    run: async (input) => {
      assertCallerScope('propose trade', input.proposerId);

      let createdOrder: unknown;
      if (orderService?.create) {
        createdOrder = await orderService.create({
          nftId: input.offeredNftId,
          buyerId: userId,
          sellerId: userId,
          price: input.price ?? '0',
          currency: input.currency,
          type: 'SALE' as never,
          requestedNftTokenId: input.requestedNftId,
          expiresAt: input.expiresAt,
        });
      }

      const proposalId =
        createdOrder && typeof createdOrder === 'object' && 'id' in createdOrder
          ? String((createdOrder as { id: string }).id)
          : randomUUID();

      const result: TradeProposalResult = {
        tradeId: proposalId,
        proposerId: userId,
        offeredNftId: input.offeredNftId,
        requestedNftId: input.requestedNftId,
        price: input.price ?? '0',
        currency: input.currency,
        status: 'PROPOSED',
        message: `Trade proposal created successfully for caller ${userId}.`,
        createdAt: new Date().toISOString(),
        order: createdOrder,
      };

      return JSON.stringify(result);
    },
  });

  const acceptTrade = createTool({
    name: 'accept_trade',
    description:
      'Accept an incoming trade proposal or offer. Scoped strictly to the authenticated caller — ' +
      'only authorized orders/offers belonging to the caller can be accepted.',
    inputSchema: z.object({
      tradeId: z
        .string()
        .min(1)
        .describe('The ID of the trade proposal or order/offer to accept.'),
      acceptorId: z
        .string()
        .optional()
        .describe(
          'The accepting user ID. If provided, must match the authenticated caller; never trusted from model alone.',
        ),
    }),
    run: async (input) => {
      assertCallerScope('accept trade', input.acceptorId);
      assertOrderScope(input.tradeId);

      let orderResult: unknown;
      if (orderService) {
        // Enforce server-side ownership via findOneForUser
        const order = await orderService.findOneForUser(userId, input.tradeId);
        if (orderService.updateStatus) {
          orderResult = await orderService.updateStatus(
            input.tradeId,
            'COMPLETED',
          );
        } else {
          orderResult = order;
        }
      }

      if (offerService?.accept) {
        orderResult = await offerService.accept(input.tradeId, userId);
      }

      const result: TradeActionResult = {
        tradeId: input.tradeId,
        action: 'ACCEPTED',
        userId,
        status: 'COMPLETED',
        message: `Trade ${input.tradeId} accepted successfully by caller ${userId}.`,
        timestamp: new Date().toISOString(),
        order: orderResult,
      };

      return JSON.stringify(result);
    },
  });

  const cancelTrade = createTool({
    name: 'cancel_trade',
    description:
      'Cancel an existing trade proposal or offer. Scoped strictly to the caller — ' +
      'only trade proposals or orders/offers created by the caller can be cancelled.',
    inputSchema: z.object({
      tradeId: z
        .string()
        .min(1)
        .describe('The ID of the trade proposal or order/offer to cancel.'),
      reason: z
        .string()
        .max(500)
        .optional()
        .describe('Optional reason for cancelling the trade.'),
      cancellerId: z
        .string()
        .optional()
        .describe(
          'The cancelling user ID. If provided, must match the authenticated caller; never trusted from model alone.',
        ),
    }),
    run: async (input) => {
      assertCallerScope('cancel trade', input.cancellerId);
      assertOrderScope(input.tradeId);

      let cancelResult: unknown;
      if (orderService) {
        // Enforce server-side ownership via findOneForUser
        const order = await orderService.findOneForUser(userId, input.tradeId);
        if (orderService.updateStatus) {
          cancelResult = await orderService.updateStatus(
            input.tradeId,
            'CANCELLED',
          );
        } else {
          cancelResult = order;
        }
      }

      if (offerService?.cancel) {
        cancelResult = await offerService.cancel(input.tradeId, userId);
      }

      const result: TradeActionResult = {
        tradeId: input.tradeId,
        action: 'CANCELLED',
        userId,
        status: 'CANCELLED',
        reason: input.reason ?? 'Cancelled by caller',
        message: `Trade ${input.tradeId} cancelled successfully by caller ${userId}.`,
        timestamp: new Date().toISOString(),
        order: cancelResult,
      };

      return JSON.stringify(result);
    },
  });

  return [proposeTrade, acceptTrade, cancelTrade];
}
