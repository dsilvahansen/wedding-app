import { useState } from 'react'
import { doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../firebase.js'
import { calcWeight, isContributor, getOwnerRole } from '../../lib/guestUtils.js'
import TagPill from '../ui/TagPill.jsx'
import BottomSheet from '../ui/BottomSheet.jsx'

export default function GuestEditSheet({ guest, tags, userId, role, open, onClose }) {
  const [name, setName] = useState(guest?.name || '')
  const [selectedTags, setSelectedTags] = useState(guest?.tags || [])
  const [weightOverride, setWeightOverride] = useState(guest?.weightOverride || false)
  const [overrideValue, setOverrideValue] = useState(guest?.weightOverride ? guest.weight : null)
  const [isGroup, setIsGroup] = useState(guest?.isGroup || false)
  const [adultCount, setAdultCount] = useState(guest?.adultCount ?? 1)
  const [kidCount, setKidCount] = useState(guest?.kidCount ?? 0)
  const [groupNotes, setGroupNotes] = useState(guest?.groupNotes || '')
  // Local rsvp state so toggles reflect immediately without waiting for Firestore snapshot
  const [rsvp, setRsvp] = useState(guest?.rsvp ?? { hansen: {}, lavita: {}, confirmed: false })
  const [showUnarchivePrompt, setShowUnarchivePrompt] = useState(false)
  // Notes collapsed by default; auto-expanded if the guest already has notes
  const [notesOpen, setNotesOpen] = useState(!!(guest?.groupNotes))
  // Weight editing hidden by default; revealed inline when user taps "Edit"
  const [weightEditing, setWeightEditing] = useState(false)

  if (!guest) return null

  const guestOwnerRole = guest?.ownerRole

  // rsvpRows determines which owner rows to render in the RSVP table:
  // shared guests show both Hansen and Lavita rows; non-shared guests show only their owner.
  const rsvpRows = guest?.shared ? ['hansen', 'lavita'] : [guestOwnerRole]

  const effectiveWeight = calcWeight(selectedTags, userId, tags, weightOverride, overrideValue)

  function toggleTag(tagId) {
    setSelectedTags(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    )
    setWeightOverride(false)
  }

  async function handleSave() {
    try {
      const groupFields = isGroup
        ? { isGroup: true, adultCount, kidCount, groupNotes }
        : { isGroup: false, adultCount: null, kidCount: null, groupNotes }

      await updateDoc(doc(db, 'guests', guest.id), {
        name: name.trim(),
        tags: selectedTags,
        weight: effectiveWeight,
        weightOverride,
        ...groupFields,
        updatedAt: serverTimestamp(),
      })
      onClose()
    } catch (err) {
      console.error(err)
      alert('Failed to save. Please try again.')
    }
  }

  async function handleDelete() {
    if (!confirm(`Remove ${guest.name} from your list?`)) return
    try {
      await deleteDoc(doc(db, 'guests', guest.id))
      onClose()
    } catch (err) {
      console.error(err)
      alert('Failed to delete. Please try again.')
    }
  }

  async function handleRsvpToggle(field) {
    const updated = { ...rsvp }
    if (field === 'confirmed') {
      updated.confirmed = !rsvp.confirmed
    } else {
      // Only the current user's owner slot is writable; confirmed is shared.
      updated[getOwnerRole(role)] = { ...rsvp[getOwnerRole(role)], [field]: !rsvp[getOwnerRole(role)]?.[field] }
    }
    // Optimistic update: apply locally first so the UI reflects the change
    // immediately without waiting for the Firestore round-trip.
    setRsvp(updated)
    try {
      await updateDoc(doc(db, 'guests', guest.id), { rsvp: updated, updatedAt: serverTimestamp() })
      if (guest.archived) {
        setShowUnarchivePrompt(true)
      }
    } catch (err) {
      console.error(err)
      setRsvp(rsvp) // revert on failure
    }
  }

  async function handleUnarchive() {
    try {
      await updateDoc(doc(db, 'guests', guest.id), { archived: false, updatedAt: serverTimestamp() })
    } catch (err) {
      console.error(err)
    } finally {
      setShowUnarchivePrompt(false)
    }
  }

  // Separate selected tags to front, unselected after
  const sortedTags = [
    ...tags.filter(t => selectedTags.includes(t.id)),
    ...tags.filter(t => !selectedTags.includes(t.id)),
  ]

  return (
    <>
      <BottomSheet open={open} onClose={onClose} title="Edit Guest">
        <div className="space-y-4">

          {/* ── NAME ── */}
          <div>
            <label className="text-xs text-gray-500">Name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1"
            />
          </div>

          {/* ── TAGS — horizontal scroll ── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-gray-500">Tags</label>
              <span className="text-xs text-gray-400">Scroll to see all ›</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {sortedTags.map(tag => (
                <div key={tag.id} className="shrink-0">
                  <TagPill tag={tag} selected={selectedTags.includes(tag.id)} onClick={() => toggleTag(tag.id)} />
                </div>
              ))}
            </div>
          </div>

          {/* ── FAMILY / GROUP toggle ── */}
          <button
            type="button"
            onClick={() => {
              const next = !isGroup
              setIsGroup(next)
              if (!next) { setAdultCount(1); setKidCount(0); setGroupNotes('') }
            }}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl border transition-colors ${
              isGroup ? 'bg-purple-50 border-purple-200' : 'bg-gray-50 border-gray-200'
            }`}
          >
            <span className="text-base">👨‍👩‍👧</span>
            <span className={`text-sm font-medium flex-1 text-left ${isGroup ? 'text-purple-700' : 'text-gray-600'}`}>
              Family / Group
            </span>
            {/* Toggle track */}
            <div className={`relative w-11 h-6 rounded-full transition-colors ${isGroup ? 'bg-purple-500' : 'bg-gray-300'}`}>
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isGroup ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
          </button>

          {isGroup && (
            <div className="flex gap-3">
              <div className="flex-1 bg-gray-50 rounded-lg px-3 py-2 text-center">
                <p className="text-xs text-gray-500 mb-1">Adults</p>
                <div className="flex items-center justify-center gap-4">
                  <button type="button" aria-label="−" onClick={() => setAdultCount(c => Math.max(1, c - 1))} className="text-purple-500 font-bold text-lg leading-none">−</button>
                  <span className="font-bold text-sm w-4 text-center">{adultCount}</span>
                  <button type="button" aria-label="+" onClick={() => setAdultCount(c => c + 1)} className="text-purple-500 font-bold text-lg leading-none">+</button>
                </div>
              </div>
              <div className="flex-1 bg-gray-50 rounded-lg px-3 py-2 text-center">
                <p className="text-xs text-gray-500 mb-1">Kids</p>
                <div className="flex items-center justify-center gap-4">
                  <button type="button" aria-label="−" onClick={() => setKidCount(c => Math.max(0, c - 1))} className="text-purple-500 font-bold text-lg leading-none">−</button>
                  <span className="font-bold text-sm w-4 text-center">{kidCount}</span>
                  <button type="button" aria-label="+" onClick={() => setKidCount(c => c + 1)} className="text-purple-500 font-bold text-lg leading-none">+</button>
                </div>
              </div>
            </div>
          )}

          {/* ── NOTES — collapsible ── */}
          {notesOpen ? (
            <div className="bg-gray-50 rounded-xl border border-gray-200 px-3 py-2">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-gray-500">Notes</p>
                {!groupNotes && (
                  <button type="button" onClick={() => setNotesOpen(false)} className="text-xs text-gray-400">Remove</button>
                )}
              </div>
              <textarea
                value={groupNotes}
                onChange={e => setGroupNotes(e.target.value)}
                placeholder="e.g. John, Jane + 1 kid..."
                rows={2}
                autoFocus={!groupNotes}
                className="w-full text-sm border-none bg-transparent resize-none focus:outline-none"
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setNotesOpen(true)}
              className="w-full flex items-center gap-2 px-3 py-3 rounded-xl border border-gray-200 bg-gray-50 text-left"
            >
              <span className="text-base">📝</span>
              <span className="text-sm text-gray-400">Add a note...</span>
            </button>
          )}

          {/* ── RSVP STATUS ── */}
          {!isContributor(role) && (
            <div>
              <label className="text-xs text-gray-500 block mb-2">RSVP Status</label>
              <div className="rounded-xl border border-gray-200 overflow-hidden">
                {rsvpRows.map((r, i) => (
                  <div key={r}>
                    {i > 0 && <div className="h-px bg-gray-100" />}
                    <div className="flex items-center gap-2 px-3 py-3">
                      <span className="text-xs font-semibold text-gray-500 w-14 shrink-0">
                        {r === 'hansen' ? 'Hansen' : 'Lavita'}
                      </span>
                      <div className="flex gap-2">
                        {/* Save the Date — only owner's own row is interactive */}
                        <button
                          type="button"
                          aria-label="saveTheDateSent"
                          disabled={getOwnerRole(role) !== r}
                          onClick={() => handleRsvpToggle('saveTheDateSent')}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            rsvp[r]?.saveTheDateSent
                              ? 'bg-purple-500 text-white'
                              : getOwnerRole(role) !== r
                                ? 'bg-gray-100 text-gray-300 cursor-default'
                                : 'bg-gray-100 text-gray-600 active:bg-gray-200'
                          }`}
                        >
                          📅 <span>Save the Date</span>
                        </button>
                        {/* Invite — only owner's own row is interactive */}
                        <button
                          type="button"
                          aria-label="inviteSent"
                          disabled={getOwnerRole(role) !== r}
                          onClick={() => handleRsvpToggle('inviteSent')}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            rsvp[r]?.inviteSent
                              ? 'bg-purple-500 text-white'
                              : getOwnerRole(role) !== r
                                ? 'bg-gray-100 text-gray-300 cursor-default'
                                : 'bg-gray-100 text-gray-600 active:bg-gray-200'
                          }`}
                        >
                          ✉️ <span>Invite</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {/* Confirmed row */}
                <div className="h-px bg-gray-100" />
                <button
                  type="button"
                  onClick={() => handleRsvpToggle('confirmed')}
                  className={`w-full flex items-center gap-2 px-3 py-3 transition-colors ${
                    rsvp.confirmed ? 'bg-green-50' : 'bg-white'
                  }`}
                >
                  <span className={`text-sm ${rsvp.confirmed ? 'opacity-100' : 'opacity-30'}`}>✅</span>
                  <span className={`text-xs font-medium ${rsvp.confirmed ? 'text-green-700' : 'text-gray-500'}`}>
                    Confirmed (shared)
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* ── WEIGHT — collapsed by default ── */}
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50">
            <span className="text-sm">⚖️</span>
            <span className="text-sm text-gray-600 flex-1">Priority weight</span>
            {weightEditing ? (
              <div className="flex items-center gap-2">
                <input
                  type="number" min="1" max="10"
                  value={weightOverride ? (overrideValue ?? effectiveWeight) : effectiveWeight}
                  onChange={e => { setOverrideValue(Number(e.target.value)); setWeightOverride(true) }}
                  className="w-14 border border-gray-300 rounded px-2 py-1 text-sm text-center"
                  autoFocus
                />
                {weightOverride && (
                  <button type="button" onClick={() => { setWeightOverride(false); setOverrideValue(null) }} className="text-xs text-gray-400 underline">reset</button>
                )}
                <button type="button" onClick={() => setWeightEditing(false)} className="text-xs text-purple-500 font-medium">Done</button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full">{effectiveWeight}</span>
                <button type="button" onClick={() => setWeightEditing(true)} className="text-xs text-purple-500">Edit</button>
              </div>
            )}
          </div>

          {/* ── SAVE / DELETE ── */}
          <div className="pt-2 space-y-2">
            <button type="button" onClick={handleSave} className="w-full bg-purple-500 text-white rounded-xl py-3 text-sm font-semibold">
              Save
            </button>
            <div className="flex justify-center">
              <button type="button" onClick={handleDelete} className="text-sm text-red-400 py-1">
                Delete guest
              </button>
            </div>
          </div>

        </div>
      </BottomSheet>

      {showUnarchivePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-5 mx-4 max-w-sm w-full space-y-3">
            <p className="text-sm font-semibold text-gray-800 text-center">
              {guest.name} has an RSVP update. Unarchive them?
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowUnarchivePrompt(false)}
                className="flex-1 border border-gray-300 rounded-xl py-2 text-sm text-gray-600"
              >
                Keep archived
              </button>
              <button
                type="button"
                onClick={handleUnarchive}
                className="flex-1 bg-purple-500 text-white rounded-xl py-2 text-sm font-semibold"
              >
                Unarchive
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
