import { betaZodTool } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';
import type { NftService } from '../../nft/nft.service';
import type { ListingService } from '../../listing/listing.service';
import type { CollectionService } from '../../collection/collection.service';
import { ListingStatus } from '../../listing/interfaces/listing.interface';

/**
 * The exact tool names this builder is allowed to return — registered as
 * this set's ownership in tool-set.registry.ts. If a tool here is renamed
 * or a new tool is added without updating this list, resolveToolSet()
 * throws instead of silently exposing it under the 'marketplace-assistant'
 * name. Keep this in sync with the `name` passed to each betaZodTool below.
 */
export const MARKETPLACE_TOOL_NAMES = [
  'search_nfts',
  'get_nft',
  'search_listings',
  'get_listing',
  'search_collections',
  'get_collection',
  'get_collection_stats',
  'get_top_collections',
] as const;

export interface MarketplaceToolsDeps {
  nftService: NftService;
  listingService: ListingService;
  collectionService: CollectionService;
}

/**
 * Read-only tool surface for the marketplace assistant. Every tool wraps an
 * existing service method directly (in-process) so the agent shares the same
 * DB connection, entities, and business rules as the REST/GraphQL surfaces.
 */
export function buildMarketplaceTools(deps: MarketplaceToolsDeps) {
  const { nftService, listingService, collectionService } = deps;

  const searchNfts = betaZodTool({
    name: 'search_nfts',
    description:
      'Search NFTs by owner, creator, collection, or free-text title/description match. Returns a paginated list.',
    inputSchema: z.object({
      search: z
        .string()
        .optional()
        .describe('Free-text search on title/description'),
      ownerId: z.string().uuid().optional(),
      creatorId: z.string().uuid().optional(),
      collectionId: z.string().uuid().optional(),
      page: z.number().int().min(1).optional(),
      limit: z.number().int().min(1).max(100).optional(),
    }),
    run: async (input) => {
      const result = await nftService.findAll({
        search: input.search,
        ownerId: input.ownerId,
        creatorId: input.creatorId,
        collectionId: input.collectionId,
        page: input.page,
        limit: input.limit,
      });
      return JSON.stringify(result);
    },
  });

  const getNft = betaZodTool({
    name: 'get_nft',
    description: 'Get full details for a single NFT by its id.',
    inputSchema: z.object({ id: z.string().uuid() }),
    run: async (input) => {
      const nft = await nftService.findById(input.id);
      return JSON.stringify(nft);
    },
  });

  const searchListings = betaZodTool({
    name: 'search_listings',
    description:
      'Search marketplace listings by status, seller, or the NFT contract/token they list. Defaults to active listings.',
    inputSchema: z.object({
      status: z.nativeEnum(ListingStatus).optional(),
      sellerId: z.string().optional(),
      nftContractId: z.string().optional(),
      nftTokenId: z.string().optional(),
      page: z.number().int().min(1).optional(),
      limit: z.number().int().min(1).max(100).optional(),
    }),
    run: async (input) => {
      const result = await listingService.findAll(input);
      return JSON.stringify(result);
    },
  });

  const getListing = betaZodTool({
    name: 'get_listing',
    description:
      'Get full details for a single listing by its id, including price and status.',
    inputSchema: z.object({ id: z.string() }),
    run: async (input) => {
      const listing = await listingService.findOne(input.id);
      return JSON.stringify(listing);
    },
  });

  const searchCollections = betaZodTool({
    name: 'search_collections',
    description: 'Search NFT collections by creator or free-text name match.',
    inputSchema: z.object({
      search: z.string().optional(),
      creatorId: z.string().uuid().optional(),
      verifiedOnly: z.boolean().optional(),
      limit: z.number().int().min(1).max(100).optional(),
    }),
    run: async (input) => {
      const result = await collectionService.findAll({
        search: input.search,
        creatorId: input.creatorId,
        verifiedOnly: input.verifiedOnly,
        first: input.limit,
      });
      return JSON.stringify(result);
    },
  });

  const getCollection = betaZodTool({
    name: 'get_collection',
    description: 'Get full details for a single collection by its id.',
    inputSchema: z.object({ id: z.string().uuid() }),
    run: async (input) => {
      const collection = await collectionService.findById(input.id);
      return JSON.stringify(collection);
    },
  });

  const getCollectionStats = betaZodTool({
    name: 'get_collection_stats',
    description:
      'Get aggregate stats (floor price, total volume, supply, owner count) for a collection.',
    inputSchema: z.object({ id: z.string().uuid() }),
    run: async (input) => {
      const stats = await collectionService.getStats(input.id);
      return JSON.stringify(stats);
    },
  });

  const getTopCollections = betaZodTool({
    name: 'get_top_collections',
    description: 'Get the top collections ranked by trading volume.',
    inputSchema: z.object({
      limit: z.number().int().min(1).max(50).optional(),
    }),
    run: async (input) => {
      const collections = await collectionService.getTopCollections(
        input.limit ?? 10,
      );
      return JSON.stringify(collections);
    },
  });

  return [
    searchNfts,
    getNft,
    searchListings,
    getListing,
    searchCollections,
    getCollection,
    getCollectionStats,
    getTopCollections,
  ];
}
