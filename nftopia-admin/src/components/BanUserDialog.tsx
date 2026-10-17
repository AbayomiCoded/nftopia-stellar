import { useState } from 'react'

export interface BanUserDialogProps {
  open: boolean
  user: {
    id: string
    username?: string
    email?: string
  } | null
  submitting?: boolean
  error?: string | null
  onClose: () => void
  onSubmit: (reason: string) => void | Promise<void>
}

/**
 * Modal dialog that enforces capturing a required reason and explicit confirmation
 * before banning a user account.
 */
export function BanUserDialog({ open, ...props }: BanUserDialogProps) {
  if (!open || !props.user) {
    return null
  }

  return <BanUserDialogForm key={props.user.id} {...props} user={props.user} />
}

function BanUserDialogForm({
  user,
  submitting = false,
  error = null,
  onClose,
  onSubmit,
}: Omit<BanUserDialogProps, 'open' | 'user'> & {
  user: NonNullable<BanUserDialogProps['user']>
}) {
  const [reason, setReason] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  const displayName = user.username || user.email || user.id

  const handleProceed = () => {
    const trimmed = reason.trim()
    if (!trimmed) {
      setValidationError('A reason is required to ban a user.')
      return
    }
    setValidationError(null)
    setConfirming(true)
  }

  const handleConfirm = async () => {
    const trimmed = reason.trim()
    if (!trimmed) {
      setValidationError('A reason is required to ban a user.')
      return
    }
    await onSubmit(trimmed)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ban-user-title"
    >
      <div className="w-full max-w-lg rounded-2xl border border-red-500/20 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-red-500/20 text-red-400">
                <svg
                  aria-hidden="true"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                  />
                </svg>
              </span>
              <h2 id="ban-user-title" className="text-lg font-semibold text-white">
                Ban User Account
              </h2>
            </div>
            <p className="mt-1 text-sm text-slate-400">
              User: <span className="font-medium text-slate-200">{displayName}</span>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg p-1 text-slate-400 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
            aria-label="Close dialog"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          <div>
            <label
              htmlFor="ban-reason-input"
              className="block text-xs font-medium uppercase tracking-wider text-slate-300"
            >
              Reason for Ban <span className="text-red-400">*</span>
            </label>
            <p className="mt-0.5 text-xs text-slate-400">
              Provide context for other administrators and the audit trail.
            </p>
            <textarea
              id="ban-reason-input"
              rows={3}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value)
                if (validationError) setValidationError(null)
              }}
              disabled={confirming || submitting}
              placeholder="e.g. Malicious auction activity, fraudulent payment attempts, or terms of service violation..."
              className="mt-1.5 w-full rounded-lg border border-white/10 bg-slate-800/80 p-3 text-sm text-white placeholder-slate-500 focus:border-red-500/50 focus:outline-none focus:ring-1 focus:ring-red-500/50 disabled:opacity-50"
            />
            {validationError ? (
              <p role="alert" className="mt-1 text-xs text-red-400">
                {validationError}
              </p>
            ) : null}
          </div>

          {error ? (
            <p
              role="alert"
              className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300"
            >
              {error}
            </p>
          ) : null}

          {confirming ? (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3.5">
              <p className="text-xs font-semibold text-red-300">
                Warning: Immediate Account Suspension
              </p>
              <p className="mt-1 text-xs text-red-200/90 leading-relaxed">
                Are you sure you want to ban{' '}
                <strong className="text-white">{displayName}</strong>? The user will be
                immediately prevented from logging in, creating listings, and interacting
                with marketplace contracts.
              </p>
            </div>
          ) : null}
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 border-t border-white/10 pt-4">
          <button
            type="button"
            onClick={confirming ? () => setConfirming(false) : onClose}
            disabled={submitting}
            className="rounded-lg border border-white/10 bg-slate-800 px-4 py-2 text-xs font-medium text-slate-300 transition hover:bg-slate-700 disabled:opacity-40"
          >
            {confirming ? 'Back to Reason' : 'Cancel'}
          </button>

          {confirming ? (
            <button
              type="button"
              onClick={handleConfirm}
              disabled={submitting}
              className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-red-500 disabled:opacity-40"
            >
              {submitting ? 'Banning User…' : 'Confirm Ban'}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleProceed}
              disabled={submitting}
              className="rounded-lg bg-red-600/90 px-4 py-2 text-xs font-semibold text-white transition hover:bg-red-500 disabled:opacity-40"
            >
              Continue to Confirmation
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
