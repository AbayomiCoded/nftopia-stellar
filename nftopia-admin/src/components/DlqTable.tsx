import { useTranslation } from 'react-i18next'
import type { DlqEntry, RetryStatus } from '../dlq/dlqApi'
import { formatUtc, shortId } from '../dlq/format'

const STATUS_STYLES: Record<RetryStatus, string> = {
  dlq: 'bg-red-500/15 text-red-300',
  failed: 'bg-red-500/15 text-red-300',
  pending: 'bg-amber-500/15 text-amber-300',
  processing: 'bg-cyan-500/15 text-cyan-300',
  completed: 'bg-emerald-500/15 text-emerald-300',
  cancelled: 'bg-slate-500/20 text-slate-300',
}

function StatusBadge({ status }: { status: RetryStatus }) {
  const { t } = useTranslation()
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status] ?? STATUS_STYLES.cancelled}`}>
      {t(`dlq.status.${status}`, { defaultValue: status })}
    </span>
  )
}

interface DlqTableProps {
  entries: DlqEntry[]
  /** Disables every row action while one is in progress. */
  busy?: boolean
  onRetry: (entry: DlqEntry) => void
  onCancel: (entry: DlqEntry) => void
}

/**
 * DLQ entries with their status and attempt count. A `dlq` row can be retried;
 * once re-queued it shows as `pending` and can be cancelled (the backend
 * refuses to cancel an entry that is still in the DLQ).
 */
export function DlqTable({ entries, busy = false, onRetry, onCancel }: DlqTableProps) {
  const { t } = useTranslation()

  if (entries.length === 0) {
    return <p className="text-sm text-slate-400">{t('dlq.empty')}</p>
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-white/10">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-white/5 text-xs uppercase tracking-wide text-slate-400">
          <tr>
            <th scope="col" className="px-3 py-2">{t('dlq.columns.retry')}</th>
            <th scope="col" className="px-3 py-2">{t('dlq.columns.transaction')}</th>
            <th scope="col" className="px-3 py-2">{t('dlq.columns.status')}</th>
            <th scope="col" className="px-3 py-2">{t('dlq.columns.attempts')}</th>
            <th scope="col" className="px-3 py-2">{t('dlq.columns.lastError')}</th>
            <th scope="col" className="px-3 py-2">{t('dlq.columns.entered')}</th>
            <th scope="col" className="px-3 py-2">{t('dlq.columns.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.retryId} className="border-t border-white/10 align-top">
              <td className="px-3 py-2 font-mono text-xs text-slate-300" title={entry.retryId}>
                {shortId(entry.retryId)}
              </td>
              <td className="px-3 py-2 text-slate-300">
                #{entry.transactionId}
                <span className="block font-mono text-xs text-slate-500" title={entry.contractTxId}>
                  {shortId(entry.contractTxId)}
                </span>
              </td>
              <td className="px-3 py-2">
                <StatusBadge status={entry.status} />
              </td>
              <td className="px-3 py-2 text-slate-300">
                {entry.attemptCount}/{entry.maxAttempts}
              </td>
              <td className="max-w-xs px-3 py-2 text-slate-400">
                <span className="line-clamp-2 break-words" title={entry.lastError ?? undefined}>
                  {entry.lastError || t('dlq.noError')}
                </span>
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-slate-400">{formatUtc(entry.createdAt)}</td>
              <td className="px-3 py-2">
                {entry.status === 'dlq' ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onRetry(entry)}
                    className="rounded-md border border-white/10 px-2 py-1 text-xs text-slate-200 transition hover:bg-white/10 disabled:opacity-50"
                  >
                    {t('dlq.actions.retry')}
                  </button>
                ) : entry.status === 'pending' || entry.status === 'processing' ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onCancel(entry)}
                    className="rounded-md border border-red-500/30 px-2 py-1 text-xs text-red-300 transition hover:bg-red-500/10 disabled:opacity-50"
                  >
                    {t('dlq.actions.cancel')}
                  </button>
                ) : (
                  <span className="text-xs text-slate-500">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
