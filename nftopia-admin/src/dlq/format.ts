import { toEpochMs } from './dlqApi'

/** `2026-10-16 09:30 UTC`: operators compare times across regions, so always UTC. */
export function formatUtc(value: number | string | null | undefined): string {
  const ms = toEpochMs(value)
  if (ms === null) return '—'
  return `${new Date(ms).toISOString().slice(0, 16).replace('T', ' ')} UTC`
}

/** First 8 characters of a UUID or hash; the full value goes in a `title`. */
export function shortId(id: string): string {
  return id.length > 8 ? id.slice(0, 8) : id
}
