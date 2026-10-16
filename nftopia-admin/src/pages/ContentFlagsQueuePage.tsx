import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { API_BASE_URL } from '../auth/authApi'
import { createAuthorizedFetch } from '../auth/authorizedFetch'
import { useAuth } from '../auth/useAuth'
import ResolveFlagDialog, {
  type ResolveFlagPayload,
  type ResolutionOutcome,
} from '../components/ResolveFlagDialog'

/** A `content_flags` row as returned by `GET /admin/ai/flags`. */
interface ContentFlag {
  id: string
  entityType: string
  entityId: string
  reason: string
  severity: string
  confidence: number
  status: string
  createdAt: string
}

interface FlagPreview {
  title?: string
  description?: string
  imageUrl?: string
  detail?: string
}

const PAGE_SIZE = 50

interface FlagsPage {
  flags: ContentFlag[]
  total: number
}

type FlagStatusFilter = 'pending' | 'reviewed' | 'dismissed'
type FlagTypeFilter = 'all' | 'listing' | 'nft' | 'collection'

/** Maps the dialog's available actions to the backend's resolution statuses. */
function outcomeToStatus(outcome: ResolutionOutcome): 'reviewed' | 'dismissed' {
  return outcome === 'dismiss' ? 'dismissed' : 'reviewed'
}

/** The API may wrap the payload in `{ data: ... }`, matching the auth client. */
function unwrap(body: unknown): FlagsPage {
  let candidate = body as Record<string, unknown> | null
  while (candidate && typeof candidate === 'object' && 'data' in candidate && !('flags' in candidate)) {
    candidate = candidate.data as Record<string, unknown> | null
  }
  if (!candidate || !Array.isArray(candidate.flags)) {
    throw new Error('Invalid content flags response')
  }
  return candidate as unknown as FlagsPage
}


function unwrapEntity(body: unknown): Record<string, unknown> {
  let current = body as Record<string, unknown> | null
  while (current && typeof current === 'object' && 'data' in current && !('id' in current)) {
    current = current.data as Record<string, unknown> | null
  }
  return current ?? {}
}

function previewFromEntity(type: string, entity: Record<string, unknown>): FlagPreview {
  if (type === 'nft') {
    return {
      title: typeof entity.name === 'string' ? entity.name : undefined,
      description: typeof entity.description === 'string' ? entity.description : undefined,
      imageUrl: typeof entity.imageUrl === 'string' ? entity.imageUrl : undefined,
    }
  }
  if (type === 'collection') {
    return {
      title: typeof entity.name === 'string' ? entity.name : undefined,
      description: typeof entity.description === 'string' ? entity.description : undefined,
      imageUrl: typeof entity.imageUrl === 'string' ? entity.imageUrl : undefined,
    }
  }
  return {
    title: typeof entity.nftTokenId === 'string' ? `Token ${entity.nftTokenId}` : undefined,
    detail: typeof entity.price === 'number' || typeof entity.price === 'string'
      ? `${entity.price} ${typeof entity.currency === 'string' ? entity.currency : 'XLM'}`
      : undefined,
  }
}

/**
 * Queue of AI-raised content flags. Each row (or a multi-row selection) is
 * resolved through the confirmation-gated ResolveFlagDialog, which is wired to
 * the backend's `PATCH /admin/ai/flags/:id` resolve endpoint.
 */
export default function ContentFlagsQueuePage() {
  const { t } = useTranslation()
  const { store } = useAuth()
  const api = useMemo(() => createAuthorizedFetch(store), [store])

  const [flags, setFlags] = useState<ContentFlag[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [previews, setPreviews] = useState<Record<string, FlagPreview>>({})
  const [statusFilter, setStatusFilter] = useState<FlagStatusFilter>('pending')
  const [typeFilter, setTypeFilter] = useState<FlagTypeFilter>('all')
  const [selected, setSelected] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogTarget, setDialogTarget] = useState<ContentFlag | null>(null)
  const [bulk, setBulk] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const query = new URLSearchParams({ status: statusFilter, limit: String(PAGE_SIZE), offset: String(offset) })
      if (typeFilter !== 'all') query.set('entityType', typeFilter)
      const response = await api(`${API_BASE_URL}/admin/ai/flags?${query.toString()}`)
      if (!response.ok) {
        throw new Error(String(response.status))
      }
      const page = unwrap(await response.json())
      setFlags(page.flags)
      setTotal(page.total ?? page.flags.length)
      const details = await Promise.all(page.flags.map(async (flag) => {
        try {
          const endpoint = flag.entityType === 'nft' ? 'nfts'
            : flag.entityType === 'listing' ? 'listings'
              : flag.entityType === 'collection' ? 'collections' : null
          if (!endpoint) return [flag.id, {}] as const
          const detailResponse = await api(`${API_BASE_URL}/${endpoint}/${encodeURIComponent(flag.entityId)}`)
          if (!detailResponse.ok) return [flag.id, {}] as const
          const payload = await detailResponse.json()
          const value = unwrapEntity(payload)
          return [flag.id, previewFromEntity(flag.entityType, value)] as const
        } catch {
          return [flag.id, {}] as const
        }
      }))
      setPreviews(Object.fromEntries(details))
      setError(null)
    } catch {
      setError(t('contentFlags.error.load'))
    } finally {
      setLoading(false)
    }
  }, [api, offset, statusFilter, t, typeFilter])

  useEffect(() => {
    void load()
  }, [load])

  const resolveFlag = useCallback(
    async (flag: ContentFlag, payload: ResolveFlagPayload) => {
      const response = await api(`${API_BASE_URL}/admin/ai/flags/${flag.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: outcomeToStatus(payload.outcome),
          ...(payload.reason ? { reason: payload.reason } : {}),
        }),
      })
      if (!response.ok) {
        throw new Error(String(response.status))
      }
    },
    [api],
  )

  const openSingle = (flag: ContentFlag) => {
    setDialogTarget(flag)
    setBulk(false)
    setDialogOpen(true)
  }

  const openBulk = () => {
    setDialogTarget(null)
    setBulk(true)
    setDialogOpen(true)
  }

  const closeDialog = () => {
    if (submitting) return
    setDialogOpen(false)
    setDialogTarget(null)
    setBulk(false)
  }

  const handleSubmit = async (payload: ResolveFlagPayload) => {
    setSubmitting(true)
    setError(null)
    try {
      if (bulk) {
        const targets = flags.filter((flag) => selected.includes(flag.id))
        const results = await Promise.allSettled(
          targets.map((flag) => resolveFlag(flag, payload)),
        )
        const failedIds = results.flatMap((result, index) =>
          result.status === 'rejected' ? [targets[index].id] : [],
        )
        await load()
        setSelected(failedIds)
        if (failedIds.length > 0) {
          setError(t('contentFlags.error.bulkResolve'))
        } else {
          setDialogOpen(false)
          setBulk(false)
        }
      } else if (dialogTarget) {
        await resolveFlag(dialogTarget, payload)
        setDialogOpen(false)
        setDialogTarget(null)
        await load()
      }
    } catch {
      setError(t('contentFlags.error.resolve'))
    } finally {
      setSubmitting(false)
    }
  }

  const toggleSelected = (id: string) => {
    setSelected((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    )
  }

  const visibleFlags = typeFilter === 'all'
    ? flags
    : flags.filter((flag) => flag.entityType === typeFilter)
  const selectedVisibleCount = visibleFlags.reduce(
    (count, flag) => count + Number(selected.includes(flag.id)),
    0,
  )

  return (
    <section aria-label={t('contentFlags.title')} className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white">{t('contentFlags.title')}</h1>
          <p className="mt-1 text-sm text-slate-400">{t('contentFlags.description')}</p>
        </div>
        <button
          type="button"
          onClick={openBulk}
          disabled={selectedVisibleCount === 0}
          className="rounded-lg bg-cyan-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-cyan-500 disabled:opacity-50"
        >
          {t('contentFlags.actions.bulkResolve')} ({selectedVisibleCount})
        </button>
      </header>

      <div className="flex flex-wrap gap-3">
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <span>{t('contentFlags.filters.status')}</span>
          <select
            aria-label={t('contentFlags.filters.status')}
            value={statusFilter}
            onChange={(event) => {
              setOffset(0)
              setSelected([])
              setStatusFilter(event.target.value as FlagStatusFilter)
            }}
            className="rounded-md border border-white/10 bg-slate-900 px-2 py-1 text-white"
          >
            <option value="pending">{t('contentFlags.status.pending')}</option>
            <option value="reviewed">{t('contentFlags.status.reviewed')}</option>
            <option value="dismissed">{t('contentFlags.status.dismissed')}</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <span>{t('contentFlags.filters.type')}</span>
          <select
            aria-label={t('contentFlags.filters.type')}
            value={typeFilter}
            onChange={(event) => {
              setOffset(0)
              setTypeFilter(event.target.value as FlagTypeFilter)
              setSelected([])
            }}
            className="rounded-md border border-white/10 bg-slate-900 px-2 py-1 text-white"
          >
            <option value="all">{t('contentFlags.types.all')}</option>
            <option value="listing">{t('contentFlags.types.listing')}</option>
            <option value="nft">{t('contentFlags.types.nft')}</option>
            <option value="collection">{t('contentFlags.types.collection')}</option>
          </select>
        </label>
      </div>

      {error ? (
        <p role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      {!loading && total > 0 ? (
        <p className="text-xs text-slate-400">{t('contentFlags.results', { count: total })}</p>
      ) : null}

      {loading && flags.length === 0 ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : visibleFlags.length === 0 ? (
        <p className="text-sm text-slate-400">{t('contentFlags.empty')}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-white/5 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th scope="col" className="px-3 py-2">{t('contentFlags.columns.select')}</th>
                <th scope="col" className="px-3 py-2">{t('contentFlags.columns.item')}</th>
                <th scope="col" className="px-3 py-2">{t('contentFlags.columns.reason')}</th>
                <th scope="col" className="px-3 py-2">{t('contentFlags.columns.confidence')}</th>
                <th scope="col" className="px-3 py-2">{t('contentFlags.columns.status')}</th>
                <th scope="col" className="px-3 py-2">{t('contentFlags.columns.created')}</th>
                <th scope="col" className="px-3 py-2">{t('contentFlags.columns.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {visibleFlags.map((flag) => (
                <tr key={flag.id} className="border-t border-white/10">
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      disabled={flag.status !== 'pending'}
                      aria-label={`${t('contentFlags.columns.select')} ${flag.id}`}
                      checked={selected.includes(flag.id)}
                      onChange={() => toggleSelected(flag.id)}
                    />
                  </td>
                  <td className="px-3 py-2 text-slate-300">
                    <span className="block font-medium">{t(`contentFlags.types.${flag.entityType}`)}</span>
                    <span className="font-mono text-xs text-slate-400">{flag.entityId}</span>
                    <span className="block text-xs text-slate-400">{t(`contentFlags.severity.${flag.severity}`)}</span>
                    {previews[flag.id]?.imageUrl ? (
                      <img src={previews[flag.id].imageUrl} alt="" loading="lazy" className="mt-2 h-16 w-16 rounded object-cover" />
                    ) : null}
                    {previews[flag.id]?.title ? <span className="mt-1 block font-medium">{previews[flag.id].title}</span> : null}
                    {previews[flag.id]?.description ? <span className="block max-w-xs text-xs text-slate-400">{previews[flag.id].description}</span> : null}
                    {previews[flag.id]?.detail ? <span className="block text-xs text-slate-400">{previews[flag.id].detail}</span> : null}
                  </td>
                  <td className="px-3 py-2 text-slate-300">{flag.reason}</td>
                  <td className="px-3 py-2 text-slate-300">{`${Math.round(Math.max(0, Math.min(1, flag.confidence)) * 100)}%`}</td>
                  <td className="px-3 py-2 text-slate-300">{t(`contentFlags.status.${flag.status}`)}</td>
                  <td className="px-3 py-2 text-slate-400">{flag.createdAt}</td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => openSingle(flag)}
                      disabled={flag.status !== 'pending'}
                      className="rounded-md border border-white/10 px-2 py-1 text-xs text-slate-200 transition hover:bg-white/10"
                    >
                      {t('contentFlags.actions.resolve')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && total > PAGE_SIZE ? (
        <nav aria-label={t('contentFlags.pagination.label')} className="flex items-center justify-between text-sm text-slate-300">
          <button type="button" onClick={() => setOffset((current) => Math.max(0, current - PAGE_SIZE))} disabled={offset === 0} className="rounded border border-white/10 px-3 py-1 disabled:opacity-50">{t('contentFlags.pagination.previous')}</button>
          <span>{t('contentFlags.pagination.page', { page: Math.floor(offset / PAGE_SIZE) + 1, pages: Math.ceil(total / PAGE_SIZE) })}</span>
          <button type="button" onClick={() => setOffset((current) => current + PAGE_SIZE)} disabled={offset + PAGE_SIZE >= total} className="rounded border border-white/10 px-3 py-1 disabled:opacity-50">{t('contentFlags.pagination.next')}</button>
        </nav>
      ) : null}

      <ResolveFlagDialog
        open={dialogOpen}
        flagId={dialogTarget?.id}
        flagCount={bulk ? selected.length : 1}
        submitting={submitting}
        error={error}
        onClose={closeDialog}
        onSubmit={handleSubmit}
      />
    </section>
  )
}
