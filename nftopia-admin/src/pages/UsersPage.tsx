import { useCallback, useEffect, useMemo, useState } from 'react'
import { API_BASE_URL } from '../auth/authApi'
import { createAuthorizedFetch } from '../auth/authorizedFetch'
import { useAuth } from '../auth/useAuth'
import { DataTable, type Column } from '../components/DataTable'
import { BanUserDialog } from '../components/BanUserDialog'
import { UserDetailModal, type UserDetailData } from '../components/UserDetailModal'

export interface UserSummary {
  id: string
  username?: string
  email?: string
  walletAddress?: string
  address?: string
  role: string
  isBanned: boolean
  isEmailVerified?: boolean
  twoFactorEnabled?: boolean
  createdAt: string
  lastLoginAt?: string
}

interface UsersApiResponse {
  users: UserSummary[]
  total: number
}

function unwrapUsers(body: unknown): UsersApiResponse {
  const candidate = body as UsersApiResponse | { data: UsersApiResponse }
  if ('users' in candidate) return candidate
  if (candidate.data && 'users' in candidate.data) return candidate.data
  return { users: [], total: 0 }
}

function unwrapDetail(body: unknown): UserDetailData | null {
  const candidate = body as UserDetailData | { data: UserDetailData }
  if ('user' in candidate) return candidate
  if (candidate.data && 'user' in candidate.data) return candidate.data
  return null
}

export default function UsersPage() {
  const { store } = useAuth()
  const api = useMemo(() => createAuthorizedFetch(store), [store])

  // Filters & Pagination State
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'banned'>('all')
  const [page, setPage] = useState(1)
  const pageSize = 15

  // Data State
  const [users, setUsers] = useState<UserSummary[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Modals State
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [detailData, setDetailData] = useState<UserDetailData | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)

  const [banUserTarget, setBanUserTarget] = useState<UserSummary | null>(null)
  const [banDialogOpen, setBanDialogOpen] = useState(false)
  const [banning, setBanning] = useState(false)
  const [banError, setBanError] = useState<string | null>(null)

  const [unbanning, setUnbanning] = useState(false)

  // Debounce search input by 300ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search)
    }, 300)
    return () => clearTimeout(handler)
  }, [search])

  // Keep pagination in sync with every filter so a new result set starts at page 1.
  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, statusFilter])

  // Load users list
  const loadUsers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (debouncedSearch.trim()) params.append('search', debouncedSearch.trim())
      if (statusFilter !== 'all') params.append('status', statusFilter)
      params.append('limit', String(pageSize))
      params.append('offset', String((page - 1) * pageSize))

      const res = await api(`${API_BASE_URL}/admin/users?${params.toString()}`)
      if (!res.ok) {
        throw new Error(`Failed to load users: HTTP ${res.status}`)
      }
      const data = unwrapUsers(await res.json())
      setUsers(data.users ?? [])
      setTotal(data.total ?? 0)
    } catch {
      setError('Unable to load users. Please check your connection.')
    } finally {
      setLoading(false)
    }
  }, [api, debouncedSearch, statusFilter, page])

  useEffect(() => {
    void loadUsers()
  }, [loadUsers])

  // Load detailed record for user modal
  const loadUserDetails = useCallback(
    async (userId: string) => {
      setDetailLoading(true)
      setDetailError(null)
      try {
        const res = await api(`${API_BASE_URL}/admin/users/${userId}`)
        if (!res.ok) {
          throw new Error(`Failed to load user details: HTTP ${res.status}`)
        }
        const data = unwrapDetail(await res.json())
        setDetailData(data)
      } catch {
        setDetailError('Unable to load full user details and moderation history.')
      } finally {
        setDetailLoading(false)
      }
    },
    [api],
  )

  const openUserDetail = (user: UserSummary) => {
    setSelectedUserId(user.id)
    setDetailModalOpen(true)
    void loadUserDetails(user.id)
  }

  const closeUserDetail = () => {
    setDetailModalOpen(false)
    setSelectedUserId(null)
    setDetailData(null)
  }

  const handleOpenBan = (targetUser: { id: string; username?: string; email?: string }) => {
    setBanUserTarget({
      id: targetUser.id,
      username: targetUser.username,
      email: targetUser.email,
      role: 'USER',
      isBanned: false,
      createdAt: '',
    })
    setBanError(null)
    setBanDialogOpen(true)
  }

  const handleBanSubmit = async (reason: string) => {
    if (!banUserTarget) return
    setBanning(true)
    setBanError(null)
    try {
      const res = await api(`${API_BASE_URL}/admin/users/${banUserTarget.id}/ban`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })
      if (!res.ok) {
        const errorText = await res.text()
        throw new Error(errorText || `Ban failed with status ${res.status}`)
      }

      // Update in-memory users list immediately
      setUsers((prev) =>
        prev.map((u) => (u.id === banUserTarget.id ? { ...u, isBanned: true } : u)),
      )

      // If detail modal is open for this user, refresh or update detail
      if (selectedUserId === banUserTarget.id) {
        void loadUserDetails(banUserTarget.id)
      }

      setBanDialogOpen(false)
      setBanUserTarget(null)
      setSuccessMessage(`User successfully banned.`)
      setTimeout(() => setSuccessMessage(null), 4000)
    } catch (err: unknown) {
      setBanError(
        err instanceof Error ? err.message : 'Failed to ban user. Please try again.',
      )
    } finally {
      setBanning(false)
    }
  }

  const handleUnban = async (targetUser: { id: string; username?: string; email?: string }) => {
    const displayName = targetUser.username || targetUser.email || targetUser.id
    if (!window.confirm(`Are you sure you want to unban ${displayName}?`)) {
      return
    }

    setUnbanning(true)
    try {
      const res = await api(`${API_BASE_URL}/admin/users/${targetUser.id}/unban`, {
        method: 'PUT',
      })
      if (!res.ok) {
        throw new Error(`Unban failed with status ${res.status}`)
      }

      // Update in-memory users list immediately
      setUsers((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, isBanned: false } : u)),
      )

      // If detail modal is open for this user, refresh detail
      if (selectedUserId === targetUser.id) {
        void loadUserDetails(targetUser.id)
      }

      setSuccessMessage(`User successfully unbanned.`)
      setTimeout(() => setSuccessMessage(null), 4000)
    } catch {
      alert('Failed to unban user. Please try again.')
    } finally {
      setUnbanning(false)
    }
  }

  // Columns definition for DataTable
  const columns: Column<UserSummary>[] = [
    {
      key: 'user',
      header: 'User',
      render: (user) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-500/15 font-semibold text-cyan-300 text-xs">
            {(user.username?.[0] || user.email?.[0] || 'U').toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-white">{user.username || '—'}</p>
            <p className="text-xs text-slate-400">{user.email || 'No email'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'wallet',
      header: 'Stellar Wallet',
      render: (user) => {
        const address = user.walletAddress || user.address
        if (!address) {
          return <span className="text-xs text-slate-500">Not linked</span>
        }
        return (
          <span className="font-mono text-xs text-slate-300">
            {address.slice(0, 6)}…{address.slice(-6)}
          </span>
        )
      },
    },
    {
      key: 'role',
      header: 'Role',
      render: (user) => (
        <span className="inline-block rounded border border-white/10 bg-slate-800 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-300">
          {user.role}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (user) =>
        user.isBanned ? (
          <span className="inline-flex items-center rounded-md border border-red-500/30 bg-red-500/20 px-2 py-0.5 text-xs font-semibold text-red-300">
            Banned
          </span>
        ) : (
          <span className="inline-flex items-center rounded-md border border-emerald-500/30 bg-emerald-500/20 px-2 py-0.5 text-xs font-semibold text-emerald-300">
            Active
          </span>
        ),
    },
    {
      key: 'joined',
      header: 'Joined',
      render: (user) => (
        <span className="text-xs text-slate-400">
          {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (user) => (
        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => openUserDetail(user)}
            className="rounded-lg border border-white/10 bg-slate-800/80 px-2.5 py-1 text-xs font-medium text-slate-200 transition hover:bg-slate-700"
          >
            Details
          </button>
          {user.isBanned ? (
            <button
              type="button"
              onClick={() => handleUnban(user)}
              disabled={unbanning}
              className="rounded-lg bg-emerald-600/80 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
            >
              Unban
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleOpenBan(user)}
              className="rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-300 transition hover:bg-red-500/20"
            >
              Ban
            </button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-white md:text-3xl">
              User Management
            </h1>
            <span className="rounded-full border border-cyan-500/30 bg-cyan-500/15 px-2.5 py-0.5 text-xs font-semibold text-cyan-300">
              {total} Total
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Search, inspect account profiles, examine Stellar wallets, and manage ban status.
          </p>
        </div>
      </header>

      {/* Notifications */}
      {successMessage && (
        <div
          role="status"
          className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-medium text-emerald-300"
        >
          {successMessage}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs font-medium text-red-300"
        >
          {error}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-800/40 p-3">
        {/* Search Input */}
        <div className="relative min-w-[260px] flex-1 sm:max-w-md">
          <svg
            className="absolute left-3 top-2.5 h-4 w-4 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by username, email, or wallet address…"
            aria-label="Search users"
            className="w-full rounded-lg border border-white/10 bg-slate-900/80 py-2 pl-9 pr-3 text-xs text-white placeholder-slate-400 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-slate-900/60 p-1 text-xs">
          {(['all', 'active', 'banned'] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => {
                setStatusFilter(status)
                setPage(1)
              }}
              className={`rounded-md px-3 py-1 font-medium capitalize transition ${
                statusFilter === status
                  ? 'bg-cyan-500/20 text-cyan-300'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Reusable Data Table */}
      <DataTable<UserSummary>
        ariaLabel="Users Table"
        columns={columns}
        data={users}
        keyExtractor={(user) => user.id}
        loading={loading}
        onRowClick={openUserDetail}
        emptyMessage={
          debouncedSearch || statusFilter !== 'all'
            ? 'No users match your search and filter criteria.'
            : 'No users registered yet.'
        }
        pagination={{
          page,
          pageSize,
          total,
          onPageChange: setPage,
        }}
      />

      {/* User Detail Modal */}
      <UserDetailModal
        open={detailModalOpen}
        userId={selectedUserId}
        loading={detailLoading}
        error={detailError}
        detail={detailData}
        onClose={closeUserDetail}
        onBanClick={(u) => handleOpenBan(u)}
        onUnbanClick={(u) => handleUnban(u)}
        unbanning={unbanning}
      />

      {/* Ban User Dialog */}
      <BanUserDialog
        open={banDialogOpen}
        user={banUserTarget}
        submitting={banning}
        error={banError}
        onClose={() => {
          if (!banning) {
            setBanDialogOpen(false)
            setBanUserTarget(null)
            setBanError(null)
          }
        }}
        onSubmit={handleBanSubmit}
      />
    </div>
  )
}
