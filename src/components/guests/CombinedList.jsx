import { useState } from 'react'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../firebase.js'
import { useAuth } from '../../hooks/useAuth.js'
import { useGuests } from '../../hooks/useGuests.js'
import { useTags } from '../../hooks/useTags.js'
import { deduplicateForCombined, sortGuests } from '../../lib/guestUtils.js'
import GuestRow from '../ui/GuestRow.jsx'

export default function CombinedList() {
  const { user, role } = useAuth()
  const { guests } = useGuests()
  const { tags } = useTags()
  const [activeTag, setActiveTag] = useState(null)
  const [sortBy, setSortBy] = useState('weight')
  const [filterOwner, setFilterOwner] = useState('all')
  const [limit, setLimit] = useState('')
  const [editingLimit, setEditingLimit] = useState(false)

  const combined = deduplicateForCombined(guests)
  const sharedCount = combined.filter(g => g.shared).length

  let filtered = combined
  if (filterOwner === 'hansen') filtered = combined.filter(g => g.owners.some(id => id === user?.uid))
  if (filterOwner === 'lavita') filtered = combined.filter(g => g.owners.some(id => id !== user?.uid))
  if (filterOwner === 'shared') filtered = combined.filter(g => g.shared)

  if (activeTag) filtered = filtered.filter(g => (g.tags ?? []).includes(activeTag) || (g.allTags ?? []).some(t => t.tagId === activeTag))

  const sorted = sortGuests(filtered, sortBy)
  const inviteLimit = limit ? parseInt(limit, 10) : null

  async function handleRsvpToggle(guestId, field) {
    const guest = guests.find(g => g.id === guestId)
    if (!guest) return
    const rsvp = { ...guest.rsvp }
    if (field === 'confirmed') {
      rsvp.confirmed = !rsvp.confirmed
    } else {
      rsvp[role] = { ...rsvp[role], [field]: !rsvp[role]?.[field] }
    }
    try {
      await updateDoc(doc(db, 'guests', guestId), { rsvp, updatedAt: serverTimestamp() })
    } catch (err) {
      console.error('Failed to toggle RSVP:', err)
    }
  }

  function getBadge(entry) {
    if (entry.shared) return { label: '★', style: { backgroundColor: '#f39c12', color: '#fff' } }
    const ownerIsCurrentUser = entry.ownerId === user?.uid
    const initial = ownerIsCurrentUser
      ? (role === 'hansen' ? 'H' : 'L')
      : (role === 'hansen' ? 'L' : 'H')
    const style = ownerIsCurrentUser
      ? { backgroundColor: '#e0d0f0', color: '#9b59b6' }
      : { backgroundColor: '#f0d0e8', color: '#c0369b' }
    return { label: initial, style }
  }

  return (
    <div>
      {/* Summary bar */}
      <div className="px-3 py-2 bg-purple-50 border-b border-purple-100 flex items-center justify-between">
        <span className="text-sm font-semibold text-purple-700">{combined.length} total</span>
        <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">{sharedCount} shared ★</span>
      </div>

      {/* Invite limit */}
      <div className="px-3 py-2 border-b border-gray-100 flex items-center gap-2">
        <span className="text-xs text-gray-500">Invite limit:</span>
        {editingLimit ? (
          <input
            autoFocus type="number" min="1"
            value={limit}
            onChange={e => setLimit(e.target.value)}
            onBlur={() => setEditingLimit(false)}
            className="w-20 border border-gray-300 rounded px-2 py-0.5 text-xs"
          />
        ) : (
          <button type="button" onClick={() => setEditingLimit(true)} className="text-xs text-purple-500 underline">
            {limit || 'Set limit'}
          </button>
        )}
        {limit && <button type="button" onClick={() => setLimit('')} className="text-xs text-gray-400">✕</button>}
      </div>

      {/* Owner filter pills */}
      <div className="flex gap-2 px-3 py-2 border-b border-gray-100 overflow-x-auto">
        {['all', 'hansen', 'lavita', 'shared'].map(f => (
          <button
            key={f}
            type="button"
            onClick={() => setFilterOwner(f)}
            className={`text-xs px-3 py-1 rounded-full whitespace-nowrap capitalize ${filterOwner === f ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            {f === 'shared' ? '★ Shared' : f === 'all' ? 'All' : f === 'hansen' ? 'Hansen' : 'Lavita'}
          </button>
        ))}
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          className="ml-auto text-xs border border-gray-200 rounded px-2 py-1 text-gray-600"
        >
          <option value="weight">Weight ↓</option>
          <option value="name">Name A–Z</option>
        </select>
      </div>

      {sorted.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">No guests yet</p>
      ) : (
        sorted.map((entry, idx) => {
          const overLimit = inviteLimit && idx >= inviteLimit
          return (
            <div key={entry.id} className={overLimit ? 'opacity-40 line-through' : ''}>
              <GuestRow
                guest={entry}
                tags={tags}
                currentRole={role}
                readOnly={false}
                onRsvpToggle={handleRsvpToggle}
                onEdit={() => {}}
                badge={getBadge(entry)}
              />
            </div>
          )
        })
      )}
    </div>
  )
}
