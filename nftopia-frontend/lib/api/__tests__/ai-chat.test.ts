import {
  AiQuotaExceededError,
  checkAiHealth,
  getAiUsage,
  sendAiChat,
  streamAiChat,
} from "../ai-chat";
import { API_CONFIG } from "@/lib/config";

describe("ai-chat api client", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  describe("checkAiHealth", () => {
    it("calls GET /ai/health and returns up status", async () => {
      const mockPayload = {
        status: "up",
        timestamp: "2026-10-19T00:00:00.000Z",
      };
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockPayload,
      });

      const result = await checkAiHealth();

      expect(global.fetch).toHaveBeenCalledWith(
        `${API_CONFIG.baseUrl}/ai/health`,
        expect.objectContaining({
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        }),
      );
      expect(result).toEqual(mockPayload);
    });

    it("returns down status when backend reports Anthropic down", async () => {
      const mockPayload = {
        status: "down",
        timestamp: "2026-10-19T00:00:00.000Z",
      };
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockPayload,
      });

      const result = await checkAiHealth();
      expect(result.status).toBe("down");
    });

    it("returns unconfigured status when backend reports API key missing", async () => {
      const mockPayload = {
        status: "unconfigured",
        timestamp: "2026-10-19T00:00:00.000Z",
      };
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockPayload,
      });

      const result = await checkAiHealth();
      expect(result.status).toBe("unconfigured");
    });

    it("throws an error when HTTP status is not ok (e.g. 500)", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 503,
      });

      await expect(checkAiHealth()).rejects.toThrow(
        "AI health check failed with status 503",
      );
    });

    it("passes AbortSignal to fetch", async () => {
      const controller = new AbortController();
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ status: "up", timestamp: "now" }),
      });

      await checkAiHealth(controller.signal);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          signal: controller.signal,
        }),
      );
    });
  });

  describe("sendAiChat", () => {
    it("sends POST /ai/chat with message body and returns reply", async () => {
      const mockReply = { reply: "Hello world", sessionId: "session-123" };
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockReply,
      });

      const result = await sendAiChat({ message: "Hello" });

      expect(global.fetch).toHaveBeenCalledWith(
        `${API_CONFIG.baseUrl}/ai/chat`,
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ message: "Hello" }),
        }),
      );
      expect(result).toEqual(mockReply);
    });

    it("throws an error on non-ok response", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });

      await expect(sendAiChat({ message: "Hello" })).rejects.toThrow(
        "AI request failed with status 500",
      );
    });

    it("throws AiQuotaExceededError when the daily/monthly cap is reached (403)", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({
          statusCode: 403,
          code: "AI_DAILY_TOKEN_CAP_REACHED",
          message: "Daily AI usage cap reached (200000 tokens). Please try again tomorrow.",
          resetsAt: "2026-10-21T00:00:00.000Z",
        }),
      });

      let caught: unknown;
      try {
        await sendAiChat({ message: "Hello" });
      } catch (err) {
        caught = err;
      }

      expect(caught).toBeInstanceOf(AiQuotaExceededError);
      const error = caught as AiQuotaExceededError;
      expect(error.code).toBe("AI_DAILY_TOKEN_CAP_REACHED");
      expect(error.resetsAt).toBe("2026-10-21T00:00:00.000Z");
      expect(error.message).toBe(
        "Daily AI usage cap reached (200000 tokens). Please try again tomorrow.",
      );
    });

    it("falls back to a generic error when a 403 body doesn't match the cap-exceeded shape", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({ message: "Forbidden" }),
      });

      await expect(sendAiChat({ message: "Hello" })).rejects.toThrow(
        "AI request failed with status 403",
      );
    });
  });

  describe("streamAiChat", () => {
    it("throws an error on non-ok response", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });

      await expect(streamAiChat({ message: "Hello" })).rejects.toThrow(
        "AI stream failed with status 500",
      );
    });

    it("throws AiQuotaExceededError when the cap is reached before any token streams", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({
          statusCode: 403,
          code: "AI_MONTHLY_TOKEN_CAP_REACHED",
          message: "Monthly AI usage cap reached (2000000 tokens). Please try again next month.",
          resetsAt: "2026-11-01T00:00:00.000Z",
        }),
      });

      let caught: unknown;
      try {
        await streamAiChat({ message: "Hello" });
      } catch (err) {
        caught = err;
      }

      expect(caught).toBeInstanceOf(AiQuotaExceededError);
      expect((caught as AiQuotaExceededError).code).toBe(
        "AI_MONTHLY_TOKEN_CAP_REACHED",
      );
      expect((caught as AiQuotaExceededError).resetsAt).toBe(
        "2026-11-01T00:00:00.000Z",
      );
    });
  });

  describe("getAiUsage", () => {
    it("calls GET /ai/usage and returns the usage summary", async () => {
      const mockUsage = {
        daily: {
          totalTokens: 1000,
          estimatedCostUsd: 0.05,
          cap: 200000,
          remaining: 199000,
          spendCapUsd: null,
          spendRemaining: null,
          percentUsed: 1,
          approachingCap: false,
          resetsAt: "2026-10-21T00:00:00.000Z",
        },
        monthly: {
          totalTokens: 50000,
          estimatedCostUsd: 2.5,
          cap: 2000000,
          remaining: 1950000,
          spendCapUsd: null,
          spendRemaining: null,
          percentUsed: 3,
          approachingCap: false,
          resetsAt: "2026-11-01T00:00:00.000Z",
        },
        hasOverride: false,
      };
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockUsage,
      });

      const result = await getAiUsage();

      expect(global.fetch).toHaveBeenCalledWith(
        `${API_CONFIG.baseUrl}/ai/usage`,
        expect.objectContaining({ method: "GET" }),
      );
      expect(result).toEqual(mockUsage);
    });

    it("throws an error on non-ok response", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
      });

      await expect(getAiUsage()).rejects.toThrow(
        "AI usage request failed with status 401",
      );
    });
  });
});
