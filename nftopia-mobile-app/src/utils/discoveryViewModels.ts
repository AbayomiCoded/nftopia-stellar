// Pure data-shaping helpers for the Home screen discovery sections
// (trending carousel, new drops). Kept side-effect free and decoupled from
// GraphQL/React so they're cheap to unit test independently of rendering.

export interface TrendingCollectionRaw {
  id: string;
  name: string;
  image: string;
  floorPrice: string;
  totalVolume: string;
  totalSupply: number;
  isVerified?: boolean | null;
}

export interface TrendingCollectionCard {
  id: string;
  name: string;
  imageUrl: string;
  floorPriceLabel: string;
  volumeLabel: string;
  itemCount: number;
  isVerified: boolean;
}

export interface NewListingRaw {
  id: string;
  price: string;
  currency: string;
  createdAt: string;
  nft?: {
    id: string;
    name: string;
    image?: string | null;
  } | null;
}

export interface NewDropCard {
  id: string;
  nftId: string;
  name: string;
  imageUrl: string;
  priceLabel: string;
}

const FALLBACK_IMAGE = '';

/** Maps raw `topCollections` results into card view-models for TrendingCarousel. */
export function mapTrendingCollections(
  collections: TrendingCollectionRaw[] | null | undefined,
): TrendingCollectionCard[] {
  if (!collections) return [];

  return collections.map((collection) => ({
    id: collection.id,
    name: collection.name,
    imageUrl: collection.image || FALLBACK_IMAGE,
    floorPriceLabel: formatXlmAmount(collection.floorPrice),
    volumeLabel: formatXlmAmount(collection.totalVolume),
    itemCount: collection.totalSupply ?? 0,
    isVerified: Boolean(collection.isVerified),
  }));
}

/** Maps raw `listings` (sorted newest) results into card view-models for the New Drops section. */
export function mapNewListings(
  listings: NewListingRaw[] | null | undefined,
): NewDropCard[] {
  if (!listings) return [];

  return listings
    .filter((listing): listing is NewListingRaw & { nft: NonNullable<NewListingRaw['nft']> } =>
      Boolean(listing.nft),
    )
    .map((listing) => ({
      id: listing.id,
      nftId: listing.nft.id,
      name: listing.nft.name,
      imageUrl: listing.nft.image || FALLBACK_IMAGE,
      priceLabel: `${formatXlmAmount(listing.price)} ${listing.currency}`,
    }));
}

function formatXlmAmount(value: string | null | undefined): string {
  const num = Number(value);
  if (!value || Number.isNaN(num)) return '0';
  // Trim trailing zeros from Stellar's 7-decimal precision without losing
  // meaningful digits, e.g. "12.5000000" -> "12.5", "0.0000000" -> "0".
  return num.toFixed(7).replace(/\.?0+$/, '') || '0';
}

export type DiscoverySectionState = 'loading' | 'empty' | 'error' | 'ready';

/** Single source of truth for which state a discovery section should render. */
export function resolveSectionState(params: {
  loading: boolean;
  error: boolean;
  itemCount: number;
}): DiscoverySectionState {
  if (params.error) return 'error';
  if (params.loading && params.itemCount === 0) return 'loading';
  if (params.itemCount === 0) return 'empty';
  return 'ready';
}
