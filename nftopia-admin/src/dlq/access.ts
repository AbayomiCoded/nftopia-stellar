/**
 * Who may open the transaction retry / DLQ screen.
 *
 * Bulk retry and cleanup act on failed settlements, so this list is kept
 * separate from `ADMIN_ROLES`: widening console access (e.g. to MODERATOR)
 * must not widen access to this screen. When the auth system gains a narrower
 * ops role, replace 'ADMIN' here; the backend routes check `UserRole.ADMIN`
 * and need the same change.
 */
export const DLQ_ROLES: readonly string[] = ['ADMIN']

export function canManageDlq(role: string | null | undefined): boolean {
  return typeof role === 'string' && DLQ_ROLES.includes(role)
}
