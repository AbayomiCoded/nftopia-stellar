import { CATEGORIES, findCategoryById } from './categories';

describe('CATEGORIES', () => {
  it('has at least one category', () => {
    expect(CATEGORIES.length).toBeGreaterThan(0);
  });

  it('has unique ids', () => {
    const ids = CATEGORIES.map((category) => category.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every category has a non-empty id, labelKey, and icon', () => {
    for (const category of CATEGORIES) {
      expect(category.id.length).toBeGreaterThan(0);
      expect(category.labelKey.length).toBeGreaterThan(0);
      expect(category.icon.length).toBeGreaterThan(0);
    }
  });

  it('every labelKey is namespaced under home.discovery.categories', () => {
    for (const category of CATEGORIES) {
      expect(category.labelKey.startsWith('home.discovery.categories.')).toBe(
        true,
      );
    }
  });

  it('includes the expected core categories', () => {
    const ids = CATEGORIES.map((category) => category.id);
    expect(ids).toEqual(
      expect.arrayContaining(['art', 'music', 'gaming', 'photography']),
    );
  });
});

describe('findCategoryById', () => {
  it('returns the matching category', () => {
    const found = findCategoryById('art');
    expect(found).toBeDefined();
    expect(found?.id).toBe('art');
  });

  it('returns undefined for an unknown id', () => {
    expect(findCategoryById('does-not-exist')).toBeUndefined();
  });
});
