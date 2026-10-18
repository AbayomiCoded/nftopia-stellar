// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import ContentFlagsQueuePage from '../pages/ContentFlagsQueuePage'
import { useAuth } from '../auth/useAuth'

vi.mock('../auth/useAuth', () => ({
  useAuth: vi.fn(),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, options?: { count?: number }) => {
    if (key === 'contentFlags.results') return `${options?.count} matching flags`
    const parts = key.split('.')
    const messages: Record<string, string> = {
      'contentFlags.title': 'Content Flags',
      'contentFlags.description': 'Review flagged content',
      'contentFlags.empty': 'No flags match these filters.',
      'contentFlags.filters.status': 'Status',
      'contentFlags.filters.type': 'Content type',
      'contentFlags.types.all': 'All types',
      'contentFlags.types.listing': 'Listing',
      'contentFlags.types.nft': 'NFT',
      'contentFlags.types.collection': 'Collection',
      'contentFlags.status.pending': 'Pending',
      'contentFlags.status.reviewed': 'Reviewed',
      'contentFlags.status.dismissed': 'Dismissed',
      'contentFlags.severity.high': 'High severity',
      'contentFlags.columns.select': 'Select',
      'contentFlags.columns.item': 'Item',
      'contentFlags.columns.reason': 'Reason',
      'contentFlags.columns.confidence': 'Confidence',
      'contentFlags.columns.status': 'Status',
      'contentFlags.columns.created': 'Created',
      'contentFlags.columns.actions': 'Actions',
      'contentFlags.actions.bulkResolve': 'Bulk resolve',
      'contentFlags.actions.resolve': 'Resolve',
      'contentFlags.error.load': 'Unable to load content flags.',
      'contentFlags.error.resolve': 'Unable to resolve the flag. Please try again.',
      'contentFlags.error.bulkResolve': 'Unable to bulk resolve the selected flags. Please try again.',
      'contentFlags.pagination.label': 'Content flag pages',
      'contentFlags.pagination.previous': 'Previous',
      'contentFlags.pagination.next': 'Next',
    }
    return messages[parts.join('.')] ?? key
  } }),
}))

const flags = [
  { id: 'flag-1', entityType: 'nft', entityId: 'nft-1', reason: 'Possible misleading metadata', severity: 'high', confidence: 0.91, status: 'pending', createdAt: '2026-10-15T10:00:00.000Z' },
  { id: 'flag-2', entityType: 'listing', entityId: 'listing-2', reason: 'Suspicious listing text', severity: 'medium', confidence: 0.72, status: 'pending', createdAt: '2026-10-14T10:00:00.000Z' },
]

function setupFetch() {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    if (init?.method === 'PATCH') return new Response('{}', { status: 200 })
    const url = String(input)
    if (/\/(nfts|listings|collections)\/[^/?]+(?:\?|$)/.test(url)) {
      return Response.json({})
    }
    return Response.json({ flags, total: flags.length })
  })
  const store = {
    getState: () => ({ status: 'authenticated', token: 'admin-token' }),
    handleUnauthorized: vi.fn(),
  }
  vi.mocked(useAuth).mockReturnValue({ store } as never)
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('Content flags moderation queue', () => {
  it('lists returned flags with AI rationale and confidence', async () => {
    setupFetch()
    render(<ContentFlagsQueuePage />)

    expect(await screen.findByText('Possible misleading metadata')).toBeTruthy()
    expect(screen.getByText('91%')).toBeTruthy()
    expect(screen.getByText('High severity')).toBeTruthy()
    expect(screen.getByText('nft-1')).toBeTruthy()
  })

  it('requests selected status and filters by content type', async () => {
    const fetchMock = setupFetch()
    render(<ContentFlagsQueuePage />)
    await screen.findByText('Possible misleading metadata')

    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'reviewed' } })
    await waitFor(() => expect(fetchMock).toHaveBeenLastCalledWith(
      expect.stringContaining('/admin/ai/flags?status=reviewed'),
      expect.objectContaining({ headers: expect.any(Headers) }),
    ))

    fireEvent.change(screen.getByLabelText('Content type'), { target: { value: 'listing' } })
    await waitFor(() => expect(fetchMock).toHaveBeenLastCalledWith(
      expect.stringContaining('entityType=listing'),
      expect.objectContaining({ headers: expect.any(Headers) }),
    ))
    expect(await screen.findByText('Suspicious listing text')).toBeTruthy()
    expect(screen.queryByText('Possible misleading metadata')).toBeNull()
  })

  it('resolves a flag using the backend DTO status and optional reason', async () => {
    const fetchMock = setupFetch()
    render(<ContentFlagsQueuePage />)
    await screen.findByText('Possible misleading metadata')

    fireEvent.click(screen.getAllByRole('button', { name: 'Resolve' })[0])
    fireEvent.change(screen.getByLabelText(/Reason/), { target: { value: 'Reviewed by moderator' } })
    fireEvent.click(screen.getByRole('button', { name: 'Review resolution' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirm resolution' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/admin/ai/flags/flag-1'),
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ status: 'reviewed', reason: 'Reviewed by moderator' }),
      }),
    ))
  })

  it('bulk resolves multiple selected pending flags', async () => {
    const fetchMock = setupFetch()
    render(<ContentFlagsQueuePage />)
    await waitFor(() => {
      expect(screen.getByLabelText('Select flag-1')).toBeTruthy()
      expect(screen.getByLabelText('Select flag-2')).toBeTruthy()
      expect(screen.queryByText('Loading…')).toBeNull()
    })

    fireEvent.click(screen.getByLabelText('Select flag-1'))
    fireEvent.click(screen.getByLabelText('Select flag-2'))
    fireEvent.click(screen.getByRole('button', { name: 'Bulk resolve (2)' }))
    fireEvent.click(screen.getByRole('button', { name: 'Review resolution' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirm resolution' }))

    await waitFor(() => {
      const patches = fetchMock.mock.calls.filter(([, init]) => init?.method === 'PATCH')
      expect(patches).toHaveLength(2)
    })
  })

})
