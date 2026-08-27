import {
  resolveToolSet,
  registerToolSet,
  unregisterToolSet,
  assertToolSetIntegrity,
} from './tool-set.registry';
import {
  buildMarketplaceTools,
  MARKETPLACE_TOOL_NAMES,
} from './marketplace.tools';
import type { RunnableToolLike, ToolSetName } from './tool-set.types';

const fakeDeps = {
  nftService: {} as never,
  listingService: {} as never,
  collectionService: {} as never,
};

/** Minimal stand-in for a resolved tool — only `.name` is read by the guard. */
const fakeTool = (name: string): RunnableToolLike =>
  ({ name }) as unknown as RunnableToolLike;

describe('tool-set.registry', () => {
  describe('resolveToolSet("marketplace-assistant")', () => {
    it('returns exactly the tools declared in MARKETPLACE_TOOL_NAMES', () => {
      const tools = resolveToolSet('marketplace-assistant', fakeDeps);
      const names = tools.map((tool) => tool.name).sort();

      expect(names).toEqual([...MARKETPLACE_TOOL_NAMES].sort());
    });

    it('does not throw', () => {
      expect(() =>
        resolveToolSet('marketplace-assistant', fakeDeps),
      ).not.toThrow();
    });
  });

  describe('MARKETPLACE_TOOL_NAMES', () => {
    it('has no duplicates', () => {
      expect(new Set(MARKETPLACE_TOOL_NAMES).size).toBe(
        MARKETPLACE_TOOL_NAMES.length,
      );
    });

    it('matches exactly what buildMarketplaceTools actually returns (no drift)', () => {
      const actualNames = buildMarketplaceTools(fakeDeps)
        .map((tool) => tool.name)
        .sort();

      expect(actualNames).toEqual([...MARKETPLACE_TOOL_NAMES].sort());
    });
  });

  describe('resolveToolSet for an unregistered tool set', () => {
    it.each<ToolSetName>(['creator-copilot', 'moderation', 'trading'])(
      'throws for "%s" since no builder is registered yet',
      (name) => {
        expect(() => resolveToolSet(name, fakeDeps)).toThrow(
          /is not registered/,
        );
      },
    );
  });

  describe('assertToolSetIntegrity', () => {
    it('does not throw when every resolved tool is declared', () => {
      const owned = new Set(['search_nfts', 'get_nft']);
      expect(() =>
        assertToolSetIntegrity(
          'marketplace-assistant',
          [fakeTool('search_nfts')],
          owned,
        ),
      ).not.toThrow();
    });

    it('throws when a resolved tool is not declared as belonging to the set', () => {
      const owned = new Set(['search_nfts']);
      expect(() =>
        assertToolSetIntegrity(
          'marketplace-assistant',
          [fakeTool('search_nfts'), fakeTool('flag_content')],
          owned,
        ),
      ).toThrow(/flag_content/);
    });

    it('lists every undeclared tool in the error, not just the first', () => {
      const owned = new Set<string>();
      expect(() =>
        assertToolSetIntegrity(
          'marketplace-assistant',
          [fakeTool('rogue_a'), fakeTool('rogue_b')],
          owned,
        ),
      ).toThrow(/rogue_a.*rogue_b/);
    });
  });

  describe('scope isolation across tool sets registered in the same process', () => {
    afterEach(() => {
      unregisterToolSet('creator-copilot');
    });

    it('does not leak another registered tool set into marketplace-assistant', () => {
      registerToolSet('creator-copilot', () => [fakeTool('draft_listing')], [
        'draft_listing',
      ]);

      const marketplaceTools = resolveToolSet(
        'marketplace-assistant',
        fakeDeps,
      );
      const marketplaceNames = marketplaceTools.map((tool) => tool.name);

      expect(marketplaceNames).not.toContain('draft_listing');
      expect(marketplaceNames.sort()).toEqual(
        [...MARKETPLACE_TOOL_NAMES].sort(),
      );
    });

    it('resolves the other tool set on its own, unaffected by marketplace-assistant', () => {
      registerToolSet('creator-copilot', () => [fakeTool('draft_listing')], [
        'draft_listing',
      ]);

      const copilotTools = resolveToolSet('creator-copilot', fakeDeps);

      expect(copilotTools.map((tool) => tool.name)).toEqual(['draft_listing']);
    });

    it('catches a tool set builder pulling in a tool it never declared', () => {
      registerToolSet(
        'creator-copilot',
        () => [fakeTool('draft_listing'), fakeTool('search_nfts')], // 'search_nfts' undeclared here
        ['draft_listing'],
      );

      expect(() => resolveToolSet('creator-copilot', fakeDeps)).toThrow(
        /search_nfts/,
      );
    });
  });
});
