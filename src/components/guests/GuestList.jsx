import { useState } from 'react'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../firebase.js'
import { useAuth } from '../../hooks/useAuth.js'
import { useGuests } from '../../hooks/useGuests.js'
import { useTags } from '../../hooks/useTags.js'
import { useBulkSelect } from '../../hooks/useBulkSelect.js'
import { sortGuests, getTotalHeadcount, getOwnerRole, isContributor } from '../../lib/guestUtils.js'
import GuestRow from '../ui/GuestRow.jsx'
import FilterBar from '../ui/FilterBar.jsx'
import GuestEditSheet from './GuestEditSheet.jsx'
import AddGuest from './AddGuest.jsx'
import BottomSheet from '../ui/BottomSheet.jsx'
import Toast from '../ui/Toast.jsx'

export default function GuestList({ readOnly }) {
  const { user, role } = useAuth()
  const { guests } = useGuests()
  const { tags } = useTags()
  const { selectionMode, selectedIds, toggleSelectionMode, toggleGuest, applyBulkAction, undoAvailable, undoBulkAction } = useBulkSelect()
  const [activeTag, setActiveTag] = useState(null)
  const [sortBy, setSortBy] = useState('weight')
  const [editingGuest, setEditingGuest] = useState(null)
  const [addingGuest, setAddingGuest] = useState(false)
  const [pendingField, setPendingField] = useState(null)
  const [toast, setToast] = useState(null)
  const [showArchived, setShowArchived] = useState(false)

  const fieldLabel = { saveTheDateSent: 'save-the-date sent', inviteSent: 'invite sent', confirmed: 'confirmed' }

  const partnerRole = role === 'hansen' ? 'lavita' : 'hansen'
  const partnerName = role === 'hansen' ? 'Lavita' : 'Hansen'

  // My List shows current user's guests; Their List shows partner's
  const myOwnerRole = getOwnerRole(role)
  const myGuests = myOwnerRole ? guests.filter(g => {
    // New guests have ownerRole; legacy guests fall back to ownerId
    const guestSide = g.ownerRole ?? (g.ownerId === user?.uid ? myOwnerRole : (myOwnerRole === 'hansen' ? 'lavita' : 'hansen'))
    return readOnly ? guestSide !== myOwnerRole : guestSide === myOwnerRole
  }) : []

  const activeGuests = myGuests.filter(g => !g.archived)
  const archivedGuests = myGuests.filter(g => g.archived)
  const filtered = activeTag ? activeGuests.filter(g => g.tags?.includes(activeTag)) : activeGuests
  const sorted = sortGuests(filtered, sortBy)
  const listName = readOnly ? `${partnerName}'s List` : 'My List'

  async function handleRsvpToggle(guestId, field) {
    if (readOnly || isContributor(role)) return
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

  async function handleApply() {
    if (!pendingField) return
    const count = selectedIds.size
    const err = await applyBulkAction(pendingField, guests)
    setPendingField(null)
    if (err) {
      setToast({ message: err })
    } else {
      setToast({ message: `${count} guest${count > 1 ? 's' : ''} updated`, undo: true })
    }
  }

  return (
    <div>
      <div className="px-3 py-2 bg-purple-50 border-b border-purple-100 flex items-center justify-between">
        <span className="text-sm font-semibold text-purple-700">
          {selectionMode ? `${listName} · ${selectedIds.size} selected` : `${listName} (${sorted.reduce((sum, g) => sum + getTotalHeadcount(g), 0)})`}
        </span>
        <div className="flex items-center gap-2">
          {!selectionMode && (
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="text-xs border border-purple-200 rounded px-2 py-1 text-purple-700 bg-purple-50"
            >
              <option value="weight">Weight ↓</option>
              <option value="name">Name A–Z</option>
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
            </select>
          )}
          {!selectionMode && !readOnly && archivedGuests.length > 0 && (
            <button
              type="button"
              onClick={() => setShowArchived(true)}
              className="text-xs text-gray-500 border border-gray-300 rounded px-2 py-1 bg-white"
            >
              Archived ({archivedGuests.length})
            </button>
          )}
          {!readOnly && !isContributor(role) && (
            <button type="button" onClick={toggleSelectionMode} className="text-xs text-purple-600 font-medium">
              {selectionMode ? 'Done' : 'Select'}
            </button>
          )}
        </div>
      </div>
      <FilterBar tags={tags} activeTag={activeTag} onTagChange={setActiveTag} />
      {sorted.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">No guests yet</p>
      ) : (
        sorted.map(guest => {
          const badge = !readOnly && (guest.createdByRole === 'hContributor' || guest.createdByRole === 'lContributor')
            ? { label: 'C', style: { backgroundColor: '#d0e8d0', color: '#2e7d32' } }
            : undefined
          return (
            <GuestRow
              key={guest.id}
              guest={guest}
              tags={tags}
              currentRole={role}
              readOnly={readOnly}
              onRsvpToggle={handleRsvpToggle}
              onEdit={selectionMode ? () => toggleGuest(guest.id) : () => !readOnly && setEditingGuest(guest)}
              selectionMode={selectionMode}
              selected={selectedIds.has(guest.id)}
              badge={selectionMode ? undefined : badge}
            />
          )
        })
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
      {selectionMode && selectedIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 z-40">
          {pendingField ? (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">
                Mark {fieldLabel[pendingField]} for {selectedIds.size} guest{selectedIds.size > 1 ? 's' : ''}?
              </span>
              <div className="flex gap-2">
                <button type="button" onClick={() => setPendingField(null)} className="text-xs text-gray-500 px-3 py-1.5 rounded-lg border border-gray-200">Cancel</button>
                <button type="button" onClick={handleApply} className="text-xs text-white bg-purple-500 px-3 py-1.5 rounded-lg font-semibold">Apply</button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">{selectedIds.size} selected</span>
              <div className="flex gap-2">
                <button type="button" onClick={() => setPendingField('saveTheDateSent')} className="text-xs bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg">📅 STD</button>
                <button type="button" onClick={() => setPendingField('inviteSent')} className="text-xs bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg">✉️ Invite</button>
                <button type="button" onClick={() => setPendingField('confirmed')} className="text-xs bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg">✅</button>
              </div>
            </div>
          )}
        </div>
      )}
      {toast && (
        <Toast
          message={toast.message}
          onDone={() => setToast(null)}
          action={toast.undo && undoAvailable ? {
            label: 'Undo',
            onClick: () => undoBulkAction(guests),
          } : undefined}
        />
      )}
      {!readOnly && !isContributor(role) && !selectionMode && (
        <button
          type="button"
          onClick={() => setAddingGuest(true)}
          className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-purple-500 text-white rounded-full w-14 h-14 text-3xl shadow-lg flex items-center justify-center z-30"
          aria-label="Add guest"
        >
          +
        </button>
      )}
      {addingGuest && (
        <BottomSheet open={addingGuest} onClose={() => setAddingGuest(false)} title="Add Guest">
          <AddGuest />
        </BottomSheet>
      )}
    </div>
  )
}
