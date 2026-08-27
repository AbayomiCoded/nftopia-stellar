export interface Category {
  id: string;
  labelKey: string;
  icon: string;
}

/**
 * Static category list for Home discovery chips. These map to the
 * free-text `category` field on marketplace listings (ListingFilterInput.category
 * in the backend GraphQL schema) — any listing tagged with a matching
 * category string will surface when a chip routes into the marketplace.
 */
export const CATEGORIES: Category[] = [
  { id: 'art', labelKey: 'home.discovery.categories.art', icon: '🎨' },
  { id: 'music', labelKey: 'home.discovery.categories.music', icon: '🎵' },
  { id: 'gaming', labelKey: 'home.discovery.categories.gaming', icon: '🎮' },
  {
    id: 'photography',
    labelKey: 'home.discovery.categories.photography',
    icon: '📷',
  },
  {
    id: 'collectibles',
    labelKey: 'home.discovery.categories.collectibles',
    icon: '🧩',
  },
  { id: 'sports', labelKey: 'home.discovery.categories.sports', icon: '⚽' },
  {
    id: 'virtual-worlds',
    labelKey: 'home.discovery.categories.virtualWorlds',
    icon: '🌐',
  },
  {
    id: 'utility',
    labelKey: 'home.discovery.categories.utility',
    icon: '🛠️',
  },
];

export const findCategoryById = (id: string): Category | undefined =>
  CATEGORIES.find((category) => category.id === id);
