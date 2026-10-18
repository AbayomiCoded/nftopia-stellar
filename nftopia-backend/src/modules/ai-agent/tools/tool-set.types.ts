/**
 * Named, enumerable tool sets an AI agent endpoint can request. Each name
 * maps to exactly one registration in tool-set.registry.ts — endpoints
 * declare which set they use instead of implicitly receiving every tool
 * that exists (see the README in this directory).
 *
 * Implemented sets:
 * - 'marketplace-assistant': read-only marketplace queries
 * - 'creator-copilot': draft listing suggestions for creators (#528)
 * - 'moderation': automated content flag generation (#527)
 * - 'trading': write-capable trade proposals scoped to caller (#641)
 */
import type { BetaRunnableTool } from '@anthropic-ai/sdk/lib/tools/BetaRunnableTool';

export type ToolSetName =
  | 'marketplace-assistant'
  | 'creator-copilot'
  | 'moderation'
  | 'trading';

/**
 * The tool shape every builder returns — the same type client.beta.messages
 * .toolRunner()'s `tools` param accepts, so resolveToolSet's result can be
 * passed straight through with no casting.
 */
export type RunnableToolLike = BetaRunnableTool<any>;

export type ToolLogger = (
  toolName: string,
  args: Record<string, unknown>,
  resultSummary: string,
  durationMs: number,
) => void;

export type ToolSetBuilder<TDeps = unknown> = (
  deps: TDeps & { toolLogger?: ToolLogger },
) => RunnableToolLike[];

export interface ToolSetRegistration<TDeps = unknown> {
  build: ToolSetBuilder<TDeps>;
  /** Every tool name `build` is allowed to return — enforced by resolveToolSet. */
  ownedToolNames: ReadonlySet<string>;
}
