import {
  mapTrendingCollections,
  mapNewListings,
  resolveSectionState,
  TrendingCollectionRaw,
  NewListingRaw,
} from './discoveryViewModels';

describe('mapTrendingCollections', () => {
  const raw: TrendingCollectionRaw = {
    id: 'col-1',
    name: 'Stellar Punks',
    image: 'https://example.com/image.png',
    floorPrice: '12.5000000',
    totalVolume: '1000.0000000',
    totalSupply: 42,
    isVerified: true,
  };

  it('maps raw collections into card view-models', () => {
    const [card] = mapTrendingCollections([raw]);

    expect(card).toEqual({
      id: 'col-1',
      name: 'Stellar Punks',
      imageUrl: 'https://example.com/image.png',
      floorPriceLabel: '12.5',
      volumeLabel: '1000',
      itemCount: 42,
      isVerified: true,
    });
  });

  it('returns an empty array for null/undefined input', () => {
    expect(mapTrendingCollections(null)).toEqual([]);
    expect(mapTrendingCollections(undefined)).toEqual([]);
  });

  it('returns an empty array for an empty input array', () => {
    expect(mapTrendingCollections([])).toEqual([]);
  });

  it('defaults isVerified to false when missing', () => {
    const [card] = mapTrendingCollections([{ ...raw, isVerified: undefined }]);
    expect(card.isVerified).toBe(false);
  });

  it('falls back to an empty image string when image is falsy', () => {
    const [card] = mapTrendingCollections([{ ...raw, image: '' }]);
    expect(card.imageUrl).toBe('');
  });

  it('preserves ordering from the input array', () => {
    const second: TrendingCollectionRaw = { ...raw, id: 'col-2', name: 'Second' };
    const cards = mapTrendingCollections([raw, second]);
    expect(cards.map((c) => c.id)).toEqual(['col-1', 'col-2']);
  });
});

describe('mapNewListings', () => {
  const raw: NewListingRaw = {
    id: 'listing-1',
    price: '5.0000000',
    currency: 'XLM',
    createdAt: '2026-08-27T00:00:00.000Z',
    nft: { id: 'nft-1', name: 'Cosmic Cat', image: 'https://example.com/nft.png' },
  };

  it('maps raw listings into card view-models', () => {
    const [card] = mapNewListings([raw]);

    expect(card).toEqual({
      id: 'listing-1',
      nftId: 'nft-1',
      name: 'Cosmic Cat',
      imageUrl: 'https://example.com/nft.png',
      priceLabel: '5 XLM',
    });
  });

  it('filters out listings with no attached nft', () => {
    const withoutNft: NewListingRaw = { ...raw, id: 'listing-2', nft: null };
    const cards = mapNewListings([raw, withoutNft]);
    expect(cards).toHaveLength(1);
    expect(cards[0].id).toBe('listing-1');
  });

  it('returns an empty array for null/undefined input', () => {
    expect(mapNewListings(null)).toEqual([]);
    expect(mapNewListings(undefined)).toEqual([]);
  });

  it('falls back to an empty image string when nft.image is missing', () => {
    const [card] = mapNewListings([
      { ...raw, nft: { id: 'nft-1', name: 'Cosmic Cat', image: null } },
    ]);
    expect(card.imageUrl).toBe('');
  });
});

describe('resolveSectionState', () => {
  it('returns "error" when error is true, regardless of loading/count', () => {
    expect(
      resolveSectionState({ loading: true, error: true, itemCount: 0 }),
    ).toBe('error');
    expect(
      resolveSectionState({ loading: false, error: true, itemCount: 5 }),
    ).toBe('error');
  });

  it('returns "loading" when loading and no items yet', () => {
    expect(
      resolveSectionState({ loading: true, error: false, itemCount: 0 }),
    ).toBe('loading');
  });

  it('returns "ready" while refetching if items are already present', () => {
    expect(
      resolveSectionState({ loading: true, error: false, itemCount: 3 }),
    ).toBe('ready');
  });

  it('returns "empty" when not loading and there are no items', () => {
    expect(
      resolveSectionState({ loading: false, error: false, itemCount: 0 }),
    ).toBe('empty');
  });

  it('returns "ready" when not loading and items are present', () => {
    expect(
      resolveSectionState({ loading: false, error: false, itemCount: 10 }),
    ).toBe('ready');
  });
});
