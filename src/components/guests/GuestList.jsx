import { useState } from 'react'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../firebase.js'
import { useAuth } from '../../hooks/useAuth.js'
import { useGuests } from '../../hooks/useGuests.js'
import { useTags } from '../../hooks/useTags.js'
import { sortGuests } from '../../lib/guestUtils.js'
import GuestRow from '../ui/GuestRow.jsx'
import FilterBar from '../ui/FilterBar.jsx'
import GuestEditSheet from './GuestEditSheet.jsx'

export default function GuestList({ readOnly }) {
  const { user, role } = useAuth()
  const { guests } = useGuests()
  const { tags } = useTags()
  const [activeTag, setActiveTag] = useState(null)
  const [sortBy, setSortBy] = useState('weight')
  const [editingGuest, setEditingGuest] = useState(null)

  const partnerRole = role === 'hansen' ? 'lavita' : 'hansen'
  const partnerName = role === 'hansen' ? 'Lavita' : 'Hansen'

  // My List shows current user's guests; Their List shows partner's
  const myGuests = guests.filter(g => readOnly
    ? g.ownerId !== user?.uid
    : g.ownerId === user?.uid
  )

  const filtered = activeTag ? myGuests.filter(g => g.tags?.includes(activeTag)) : myGuests
  const sorted = sortGuests(filtered, sortBy)
  const listName = readOnly ? `${partnerName}'s List` : 'My List'

  async function handleRsvpToggle(guestId, field) {
    if (readOnly) return
    const guest = guests.find(g => g.id === guestId)
    if (!guest) return
    const rsvp = { ...guest.rsvp }
    if (field === 'confirmed') {
      rsvp.confirmed = !rsvp.confirmed
    } else {
      rsvp[role] = { ...rsvp[role], [field]: !rsvp[role]?.[field] }
    }
    await updateDoc(doc(db, 'guests', guestId), { rsvp, updatedAt: serverTimestamp() })
  }

  return (
    <div>
      <div className="px-3 py-2 bg-purple-50 border-b border-purple-100">
        <span className="text-sm font-semibold text-purple-700">{listName} ({sorted.length})</span>
      </div>
      <FilterBar tags={tags} activeTag={activeTag} onTagChange={setActiveTag} sortBy={sortBy} onSortChange={setSortBy} />
      {sorted.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">No guests yet</p>
      ) : (
        sorted.map(guest => (
          <GuestRow
            key={guest.id}
            guest={guest}
            tags={tags}
            currentRole={role}
            readOnly={readOnly}
            onRsvpToggle={handleRsvpToggle}
            onEdit={() => !readOnly && setEditingGuest(guest)}
          />
        ))
      )}
      {editingGuest && (
        <GuestEditSheet
          guest={editingGuest}
          tags={tags}
          userId={user?.uid}
          role={role}
          open={!!editingGuest}
          onClose={() => setEditingGuest(null)}
        />
      )}
    </div>
  )
}
