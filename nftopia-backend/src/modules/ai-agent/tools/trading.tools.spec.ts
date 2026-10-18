import {
  buildTradingTools,
  TRADING_TOOL_NAMES,
  type TradingToolsDeps,
  type TradeProposalResult,
  type TradeActionResult,
} from './trading.tools';
import type { RunnableToolLike } from './tool-set.types';

describe('trading.tools (#641)', () => {
  const CALLER_USER_ID = '123e4567-e89b-12d3-a456-426614174000';
  const OTHER_USER_ID = '987fcdeb-51a2-43f7-9876-ba0987654321';
  const OFFERED_NFT_ID = '11111111-1111-4111-8111-111111111111';
  const REQUESTED_NFT_ID = '22222222-2222-4222-8222-222222222222';
  const TRADE_ID = '33333333-3333-4333-8333-333333333333';
  const OTHER_TRADE_ID = '44444444-4444-4444-8444-444444444444';

  const defaultDeps: TradingToolsDeps = {
    userId: CALLER_USER_ID,
  };

  const getTool = (
    name: (typeof TRADING_TOOL_NAMES)[number],
    customDeps: Partial<TradingToolsDeps> = {},
  ): RunnableToolLike => {
    const tools = buildTradingTools({ ...defaultDeps, ...customDeps });
    const tool = tools.find((t) => t.name === name);
    if (!tool) throw new Error(`Tool "${name}" not found`);
    return tool;
  };

  describe('TRADING_TOOL_NAMES and tool exports', () => {
    it('exposes all expected trading tool names', () => {
      expect(TRADING_TOOL_NAMES).toContain('propose_trade');
      expect(TRADING_TOOL_NAMES).toContain('accept_trade');
      expect(TRADING_TOOL_NAMES).toContain('cancel_trade');
      expect(TRADING_TOOL_NAMES).toHaveLength(3);
    });

    it('has no duplicates in TRADING_TOOL_NAMES', () => {
      expect(new Set(TRADING_TOOL_NAMES).size).toBe(TRADING_TOOL_NAMES.length);
    });

    it('matches exactly what buildTradingTools returns (no drift)', () => {
      const names = buildTradingTools(defaultDeps).map((t) => t.name);
      expect(names).toEqual([...TRADING_TOOL_NAMES]);
    });
  });

  describe('propose_trade', () => {
    const validProposeInput = {
      offeredNftId: OFFERED_NFT_ID,
      requestedNftId: REQUESTED_NFT_ID,
      price: '50',
      currency: 'XLM' as const,
    };

    it('creates a trade proposal returning JSON scoped to the caller', async () => {
      const tool = getTool('propose_trade');
      const result = await tool.run(validProposeInput);
      const parsed = JSON.parse(result as string) as TradeProposalResult;

      expect(parsed).toMatchObject({
        proposerId: CALLER_USER_ID,
        offeredNftId: OFFERED_NFT_ID,
        requestedNftId: REQUESTED_NFT_ID,
        price: '50',
        currency: 'XLM',
        status: 'PROPOSED',
      });
      expect(parsed.tradeId).toBeDefined();
      expect(parsed.createdAt).toBeDefined();
    });

    it('allows explicit proposerId when it matches the authenticated caller', async () => {
      const tool = getTool('propose_trade');
      const result = await tool.run({
        ...validProposeInput,
        proposerId: CALLER_USER_ID,
      });
      const parsed = JSON.parse(result as string) as TradeProposalResult;

      expect(parsed.proposerId).toBe(CALLER_USER_ID);
    });

    it('rejects a proposal if proposerId does not match the authenticated caller (scoping guard)', async () => {
      const tool = getTool('propose_trade');
      await expect(
        tool.run({
          ...validProposeInput,
          proposerId: OTHER_USER_ID,
        }),
      ).rejects.toThrow(/Scoping violation: cannot propose trade for user/);
    });

    it('delegates to OrderService when provided', async () => {
      const orderService = {
        create: jest.fn().mockResolvedValue({ id: 'order-123' }),
      };
      const tool = getTool('propose_trade', {
        orderService: orderService as never,
      });

      const result = await tool.run(validProposeInput);
      const parsed = JSON.parse(result as string) as TradeProposalResult;

      expect(orderService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          nftId: OFFERED_NFT_ID,
          buyerId: CALLER_USER_ID,
          sellerId: CALLER_USER_ID,
          requestedNftTokenId: REQUESTED_NFT_ID,
          price: '50',
          currency: 'XLM',
        }),
      );
      expect(parsed.tradeId).toBe('order-123');
    });

    it('propagates OrderService errors if creation fails', async () => {
      const orderService = {
        create: jest
          .fn()
          .mockRejectedValue(new Error('Contract execution failed')),
      };
      const tool = getTool('propose_trade', {
        orderService: orderService as never,
      });

      await expect(tool.run(validProposeInput)).rejects.toThrow(
        'Contract execution failed',
      );
    });

    it('accepts USDC as alternate currency', async () => {
      const tool = getTool('propose_trade');
      const result = await tool.run({
        ...validProposeInput,
        currency: 'USDC',
      });
      const parsed = JSON.parse(result as string) as TradeProposalResult;
      expect(parsed.currency).toBe('USDC');
    });

    it('calls toolLogger on success and failure', async () => {
      const toolLogger = jest.fn();
      const tool = getTool('propose_trade', { toolLogger });

      await tool.run(validProposeInput);
      expect(toolLogger).toHaveBeenCalledWith(
        'propose_trade',
        expect.objectContaining({ offeredNftId: OFFERED_NFT_ID }),
        expect.any(String),
        expect.any(Number),
      );

      // Scoping rejection logs the error
      await expect(
        tool.run({ ...validProposeInput, proposerId: OTHER_USER_ID }),
      ).rejects.toThrow();

      expect(toolLogger).toHaveBeenCalledWith(
        'propose_trade',
        expect.objectContaining({ proposerId: OTHER_USER_ID }),
        expect.stringContaining('Error:'),
        expect.any(Number),
      );
    });
  });

  describe('accept_trade', () => {
    it('accepts a trade proposal successfully returning JSON', async () => {
      const tool = getTool('accept_trade');
      const result = await tool.run({ tradeId: TRADE_ID });
      const parsed = JSON.parse(result as string) as TradeActionResult;

      expect(parsed).toMatchObject({
        tradeId: TRADE_ID,
        action: 'ACCEPTED',
        userId: CALLER_USER_ID,
        status: 'COMPLETED',
      });
    });

    it('allows explicit acceptorId when it matches the authenticated caller', async () => {
      const tool = getTool('accept_trade');
      const result = await tool.run({
        tradeId: TRADE_ID,
        acceptorId: CALLER_USER_ID,
      });
      const parsed = JSON.parse(result as string) as TradeActionResult;
      expect(parsed.userId).toBe(CALLER_USER_ID);
    });

    it('rejects accept_trade when acceptorId does not match caller (scoping guard)', async () => {
      const tool = getTool('accept_trade');
      await expect(
        tool.run({
          tradeId: TRADE_ID,
          acceptorId: OTHER_USER_ID,
        }),
      ).rejects.toThrow(/Scoping violation: cannot accept trade for user/);
    });

    it('rejects trade outside allowedOrderIds scope when set', async () => {
      const tool = getTool('accept_trade', {
        allowedOrderIds: new Set([TRADE_ID]),
      });

      await expect(tool.run({ tradeId: OTHER_TRADE_ID })).rejects.toThrow(
        /outside the caller's authorized orders\/offers scope/,
      );
    });

    it('permits trade within allowedOrderIds scope when set', async () => {
      const tool = getTool('accept_trade', {
        allowedOrderIds: new Set([TRADE_ID]),
      });

      const result = await tool.run({ tradeId: TRADE_ID });
      const parsed = JSON.parse(result as string) as TradeActionResult;
      expect(parsed.status).toBe('COMPLETED');
    });

    it('verifies ownership via OrderService.findOneForUser when provided', async () => {
      const orderService = {
        findOneForUser: jest
          .fn()
          .mockResolvedValue({ id: TRADE_ID, buyerId: CALLER_USER_ID }),
        updateStatus: jest
          .fn()
          .mockResolvedValue({ id: TRADE_ID, status: 'COMPLETED' }),
      };
      const tool = getTool('accept_trade', {
        orderService: orderService as never,
      });

      const result = await tool.run({ tradeId: TRADE_ID });
      const parsed = JSON.parse(result as string) as TradeActionResult;

      expect(orderService.findOneForUser).toHaveBeenCalledWith(
        CALLER_USER_ID,
        TRADE_ID,
      );
      expect(orderService.updateStatus).toHaveBeenCalledWith(
        TRADE_ID,
        'COMPLETED',
      );
      expect(parsed.status).toBe('COMPLETED');
    });

    it('propagates forbidden error when OrderService.findOneForUser fails authorization', async () => {
      const orderService = {
        findOneForUser: jest
          .fn()
          .mockRejectedValue(new Error('You do not have access to this order')),
      };
      const tool = getTool('accept_trade', {
        orderService: orderService as never,
      });

      await expect(tool.run({ tradeId: TRADE_ID })).rejects.toThrow(
        'You do not have access to this order',
      );
    });

    it('delegates to OfferService.accept when provided', async () => {
      const offerService = {
        accept: jest
          .fn()
          .mockResolvedValue({ offer: { id: TRADE_ID, status: 'ACCEPTED' } }),
      };
      const tool = getTool('accept_trade', {
        offerService: offerService as never,
      });

      const result = await tool.run({ tradeId: TRADE_ID });
      const parsed = JSON.parse(result as string) as TradeActionResult;

      expect(offerService.accept).toHaveBeenCalledWith(
        TRADE_ID,
        CALLER_USER_ID,
      );
      expect(parsed.status).toBe('COMPLETED');
    });

    it('logs tool calls on accept success and failure', async () => {
      const toolLogger = jest.fn();
      const tool = getTool('accept_trade', { toolLogger });

      await tool.run({ tradeId: TRADE_ID });
      expect(toolLogger).toHaveBeenCalledWith(
        'accept_trade',
        expect.objectContaining({ tradeId: TRADE_ID }),
        expect.any(String),
        expect.any(Number),
      );

      await expect(
        tool.run({ tradeId: TRADE_ID, acceptorId: OTHER_USER_ID }),
      ).rejects.toThrow();

      expect(toolLogger).toHaveBeenCalledWith(
        'accept_trade',
        expect.objectContaining({ acceptorId: OTHER_USER_ID }),
        expect.stringContaining('Error:'),
        expect.any(Number),
      );
    });
  });

  describe('cancel_trade', () => {
    it('cancels a trade proposal successfully returning JSON', async () => {
      const tool = getTool('cancel_trade');
      const result = await tool.run({
        tradeId: TRADE_ID,
        reason: 'Changed mind',
      });
      const parsed = JSON.parse(result as string) as TradeActionResult;

      expect(parsed).toMatchObject({
        tradeId: TRADE_ID,
        action: 'CANCELLED',
        userId: CALLER_USER_ID,
        status: 'CANCELLED',
        reason: 'Changed mind',
      });
    });

    it('allows explicit cancellerId when it matches the authenticated caller', async () => {
      const tool = getTool('cancel_trade');
      const result = await tool.run({
        tradeId: TRADE_ID,
        cancellerId: CALLER_USER_ID,
      });
      const parsed = JSON.parse(result as string) as TradeActionResult;
      expect(parsed.userId).toBe(CALLER_USER_ID);
    });

    it('rejects cancel_trade when cancellerId does not match caller (scoping guard)', async () => {
      const tool = getTool('cancel_trade');
      await expect(
        tool.run({
          tradeId: TRADE_ID,
          cancellerId: OTHER_USER_ID,
        }),
      ).rejects.toThrow(/Scoping violation: cannot cancel trade for user/);
    });

    it('rejects trade outside allowedOrderIds scope when set', async () => {
      const tool = getTool('cancel_trade', {
        allowedOrderIds: [TRADE_ID],
      });

      await expect(tool.run({ tradeId: OTHER_TRADE_ID })).rejects.toThrow(
        /outside the caller's authorized orders\/offers scope/,
      );
    });

    it('permits trade within allowedOrderIds scope when set', async () => {
      const tool = getTool('cancel_trade', {
        allowedOrderIds: [TRADE_ID],
      });

      const result = await tool.run({ tradeId: TRADE_ID });
      const parsed = JSON.parse(result as string) as TradeActionResult;
      expect(parsed.status).toBe('CANCELLED');
    });

    it('verifies ownership via OrderService.findOneForUser when provided', async () => {
      const orderService = {
        findOneForUser: jest
          .fn()
          .mockResolvedValue({ id: TRADE_ID, sellerId: CALLER_USER_ID }),
        updateStatus: jest
          .fn()
          .mockResolvedValue({ id: TRADE_ID, status: 'CANCELLED' }),
      };
      const tool = getTool('cancel_trade', {
        orderService: orderService as never,
      });

      const result = await tool.run({ tradeId: TRADE_ID });
      const parsed = JSON.parse(result as string) as TradeActionResult;

      expect(orderService.findOneForUser).toHaveBeenCalledWith(
        CALLER_USER_ID,
        TRADE_ID,
      );
      expect(orderService.updateStatus).toHaveBeenCalledWith(
        TRADE_ID,
        'CANCELLED',
      );
      expect(parsed.status).toBe('CANCELLED');
    });

    it('propagates forbidden error when OrderService.findOneForUser fails authorization', async () => {
      const orderService = {
        findOneForUser: jest
          .fn()
          .mockRejectedValue(new Error('You do not have access to this order')),
      };
      const tool = getTool('cancel_trade', {
        orderService: orderService as never,
      });

      await expect(tool.run({ tradeId: TRADE_ID })).rejects.toThrow(
        'You do not have access to this order',
      );
    });

    it('delegates to OfferService.cancel when provided', async () => {
      const offerService = {
        cancel: jest
          .fn()
          .mockResolvedValue({ id: TRADE_ID, status: 'CANCELLED' }),
      };
      const tool = getTool('cancel_trade', {
        offerService: offerService as never,
      });

      const result = await tool.run({ tradeId: TRADE_ID });
      const parsed = JSON.parse(result as string) as TradeActionResult;

      expect(offerService.cancel).toHaveBeenCalledWith(
        TRADE_ID,
        CALLER_USER_ID,
      );
      expect(parsed.status).toBe('CANCELLED');
    });

    it('validates reason max length in schema', () => {
      const tool = getTool('cancel_trade');
      const longReason = 'a'.repeat(501);

      expect(() => {
        tool.parse({
          tradeId: TRADE_ID,
          reason: longReason,
        });
      }).toThrow();
    });

    it('logs tool calls on cancel success and failure', async () => {
      const toolLogger = jest.fn();
      const tool = getTool('cancel_trade', { toolLogger });

      await tool.run({ tradeId: TRADE_ID });
      expect(toolLogger).toHaveBeenCalledWith(
        'cancel_trade',
        expect.objectContaining({ tradeId: TRADE_ID }),
        expect.any(String),
        expect.any(Number),
      );

      await expect(
        tool.run({ tradeId: TRADE_ID, cancellerId: OTHER_USER_ID }),
      ).rejects.toThrow();

      expect(toolLogger).toHaveBeenCalledWith(
        'cancel_trade',
        expect.objectContaining({ cancellerId: OTHER_USER_ID }),
        expect.stringContaining('Error:'),
        expect.any(Number),
      );
    });
  });
});
