import { toEpochMs, type DlqEntry, type RetryMetrics } from './dlqApi'

/**
 * Pure helpers that turn the metrics counts and DLQ rows into what the
 * dashboard shows. `GET metrics` only returns current counts per status, so the
 * trend is derived from the `createdAt` of the newest DLQ entries.
 */

const DAY_MS = 24 * 60 * 60 * 1000

export interface MetricsSummary {
  dlq: number
  /** Retries still in flight: pending + processing. */
  inFlight: number
  /** Share of finished retries that ended in failure or the DLQ, 0–1; null with nothing finished. */
  failureRate: number | null
  total: number
}

export function summarizeMetrics(metrics: RetryMetrics): MetricsSummary {
  const failures = metrics.failed + metrics.dlq
  const finished = failures + metrics.completed
  return {
    dlq: metrics.dlq,
    inFlight: metrics.pending + metrics.processing,
    failureRate: finished > 0 ? failures / finished : null,
    total: metrics.total,
  }
}

export interface DayBucket {
  /** Start of the UTC day, epoch ms. */
  day: number
  count: number
}

/**
 * Counts entries per UTC day over the last `days` days, oldest first, with
 * empty days included so the chart has no gaps.
 */
export function bucketByDay(entries: DlqEntry[], now: number, days = 7): DayBucket[] {
  const today = Math.floor(now / DAY_MS) * DAY_MS
  const first = today - (days - 1) * DAY_MS
  const buckets: DayBucket[] = Array.from({ length: days }, (_, i) => ({ day: first + i * DAY_MS, count: 0 }))
  for (const entry of entries) {
    const at = toEpochMs(entry.createdAt)
    if (at === null || at < first || at >= today + DAY_MS) continue
    buckets[Math.floor((at - first) / DAY_MS)].count += 1
  }
  return buckets
}

/** The `limit` most recent entries by `createdAt`, newest first. */
export function recentActivity(entries: DlqEntry[], limit = 5): DlqEntry[] {
  return [...entries]
    .sort((a, b) => (toEpochMs(b.createdAt) ?? 0) - (toEpochMs(a.createdAt) ?? 0))
    .slice(0, limit)
}

/** Text an operator must type to confirm a bulk retry of `count` entries. */
export function bulkRetryPhrase(count: number): string {
  return `RETRY ${count}`
}

/** Text an operator must type to confirm a cleanup of entries older than `days`. */
export function cleanupPhrase(days: number): string {
  return `CLEANUP ${days}`
}

/** Typed confirmations compare trimmed and case-sensitively, so a stray paste can't match. */
export function confirmationMatches(typed: string, phrase: string): boolean {
  return typed.trim() === phrase
}
