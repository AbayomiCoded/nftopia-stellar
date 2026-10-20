"use client";

import { useEffect } from "react";
import { useAiChatStore } from "@/lib/stores/ai-chat-store";

export type { AiChatMessage } from "@/lib/stores/ai-chat-store";

/**
 * React binding for the AI chat store.
 *
 * All conversation state and the request lifecycle live in
 * `useAiChatStore`; this hook only adapts it to the shape the chat UI wants and
 * aborts an in-flight reply when the consumer unmounts.
 */
export function useAiChat() {
  const messages = useAiChatStore((state) => state.messages);
  const status = useAiChatStore((state) => state.status);
  const error = useAiChatStore((state) => state.error);
  const healthStatus = useAiChatStore((state) => state.healthStatus);
  const isDegraded = useAiChatStore((state) => state.isDegraded);
  const isCheckingHealth = useAiChatStore((state) => state.isCheckingHealth);
  const usage = useAiChatStore((state) => state.usage);
  const isLoadingUsage = useAiChatStore((state) => state.isLoadingUsage);
  const quotaExceeded = useAiChatStore((state) => state.quotaExceeded);
  const sendMessage = useAiChatStore((state) => state.sendMessage);
  const retry = useAiChatStore((state) => state.retry);
  const cancel = useAiChatStore((state) => state.cancel);
  const checkHealth = useAiChatStore((state) => state.checkHealth);
  const fetchUsage = useAiChatStore((state) => state.fetchUsage);

  useEffect(() => () => cancel(), [cancel]);

  return {
    messages,
    isStreaming: status === "sending",
    error,
    healthStatus,
    isDegraded,
    isCheckingHealth,
    usage,
    isLoadingUsage,
    quotaExceeded,
    sendMessage,
    retry,
    cancel,
    checkHealth,
    fetchUsage,
  };
}
