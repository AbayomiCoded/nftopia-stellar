import { estimateCostUsd } from './ai-usage-pricing';

describe('estimateCostUsd', () => {
  it('computes cost for claude-opus-5 from the pricing table', () => {
    // 1M input @ $5/M + 1M output @ $25/M = $30
    expect(estimateCostUsd('claude-opus-5', 1_000_000, 1_000_000)).toBe(30);
  });

  it('computes cost for claude-sonnet-5', () => {
    // 1M input @ $2/M + 1M output @ $10/M = $12
    expect(estimateCostUsd('claude-sonnet-5', 1_000_000, 1_000_000)).toBe(12);
  });

  it('computes cost for claude-haiku-4-5', () => {
    // 1M input @ $1/M + 1M output @ $5/M = $6
    expect(estimateCostUsd('claude-haiku-4-5', 1_000_000, 1_000_000)).toBe(6);
  });

  it('falls back to claude-opus-5 pricing for an unrecognized model', () => {
    expect(estimateCostUsd('some-future-model', 1_000_000, 1_000_000)).toBe(30);
  });

  it('returns 0 for zero tokens', () => {
    expect(estimateCostUsd('claude-opus-5', 0, 0)).toBe(0);
  });

  it('scales linearly with token count', () => {
    expect(estimateCostUsd('claude-opus-5', 500_000, 0)).toBe(2.5);
  });

  it('rounds to 6 decimal places', () => {
    const cost = estimateCostUsd('claude-opus-5', 1, 1);
    expect(cost).toBeCloseTo(0.00003, 6);
  });
});
