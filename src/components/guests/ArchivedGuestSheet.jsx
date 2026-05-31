import { useState } from 'react'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../firebase.js'
import BottomSheet from '../ui/BottomSheet.jsx'
import GuestRow from '../ui/GuestRow.jsx'

export default function ArchivedGuestSheet({ guests, tags, open, onClose, readOnly }) {
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [longPressGuest, setLongPressGuest] = useState(null)

  function toggleGuest(id) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleUnarchive(ids) {
    await Promise.all(
      [...ids].map(id => updateDoc(doc(db, 'guests', id), { archived: false, updatedAt: serverTimestamp() }))
    )
    setSelectedIds(new Set())
    setSelectionMode(false)
    setLongPressGuest(null)
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Archived Guests">
      <div>
        {/* Summary bar */}
        <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-600">
            {selectionMode ? `${selectedIds.size} selected` : `${guests.length} archived`}
          </span>
          {!readOnly && (
            <button
              type="button"
              onClick={() => { setSelectionMode(prev => !prev); setSelectedIds(new Set()) }}
              className="text-xs text-purple-600 font-medium"
            >
              {selectionMode ? 'Done' : 'Select'}
            </button>
          )}
        </div>

        {/* Guest list */}
        {guests.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No archived guests</p>
        ) : (
          guests.map(guest => (
            <GuestRow
              key={guest.id}
              guest={guest}
              tags={tags}
              currentRole={null}
              readOnly={true}
              onRsvpToggle={() => {}}
              onEdit={selectionMode ? () => toggleGuest(guest.id) : undefined}
              selectionMode={selectionMode}
              selected={selectedIds.has(guest.id)}
              onLongPress={!readOnly && !selectionMode ? () => setLongPressGuest(guest) : undefined}
            />
          ))
        )}

        {/* Bulk unarchive action bar */}
        {selectionMode && selectedIds.size > 0 && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 z-40 flex items-center justify-between">
            <span className="text-xs text-gray-500">{selectedIds.size} selected</span>
            <button
              type="button"
              onClick={() => handleUnarchive(selectedIds)}
              className="text-xs bg-purple-500 text-white px-4 py-1.5 rounded-lg font-semibold"
            >
              Unarchive
            </button>
          </div>
        )}

        {/* Long-press action sheet */}
        {longPressGuest && (
          <div className="fixed inset-0 z-50 flex items-end" onClick={() => setLongPressGuest(null)}>
            <div className="w-full bg-white rounded-t-2xl shadow-xl p-4 space-y-2" onClick={e => e.stopPropagation()}>
              <p className="text-sm font-semibold text-center text-gray-700 pb-1">{longPressGuest.name}</p>
              <button
                type="button"
                onClick={() => handleUnarchive([longPressGuest.id])}
                className="w-full text-sm text-purple-600 font-medium py-3 border-t border-gray-100 text-center"
              >
                Unarchive
              </button>
              <button
                type="button"
                onClick={() => setLongPressGuest(null)}
                className="w-full text-sm text-gray-500 py-3 border-t border-gray-100 text-center"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </BottomSheet>
  )
}
