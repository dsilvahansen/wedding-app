import { useState, useRef, useEffect } from 'react'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../firebase.js'
import { useAuth } from '../../hooks/useAuth.js'
import { useGuests } from '../../hooks/useGuests.js'
import { useTags } from '../../hooks/useTags.js'
import { calcWeight, findDuplicates, getOwnerRole } from '../../lib/guestUtils.js'
import TagPill from '../ui/TagPill.jsx'
import Toast from '../ui/Toast.jsx'

export default function AddGuest() {
  const { user, role } = useAuth()
  const { guests } = useGuests()
  const { tags } = useTags()

  const [name, setName] = useState('')
  const [selectedTags, setSelectedTags] = useState([])
  const [weightOverride, setWeightOverride] = useState(false)
  const [overrideValue, setOverrideValue] = useState(null)
  const [editingWeight, setEditingWeight] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [addingTag, setAddingTag] = useState(false)
  const [toast, setToast] = useState(null)
  const [suggestions, setSuggestions] = useState([])
  const [suggestionsExpanded, setSuggestionsExpanded] = useState(false)
  const [duplicateWarning, setDuplicateWarning] = useState(null)
  const [linkedGuestId, setLinkedGuestId] = useState(null)
  const [isGroup, setIsGroup] = useState(false)
  const [adultCount, setAdultCount] = useState(1)
  const [kidCount, setKidCount] = useState(0)
  const [groupNotes, setGroupNotes] = useState('')
  const nameRef = useRef(null)

  useEffect(() => { nameRef.current?.focus() }, [])

  const effectiveWeight = calcWeight(selectedTags, user?.uid, tags, weightOverride, overrideValue)

  function handleNameChange(val) {
    setName(val)
    setLinkedGuestId(null)
    setSuggestionsExpanded(false)
    if (val.length < 2) { setSuggestions([]); setDuplicateWarning(null); return }
    const lower = val.toLowerCase()
    // Live typeahead across all guests (both users) so the user can spot
    // an existing entry before saving.
    const matches = guests.filter(g => g.name.toLowerCase().includes(lower))
    setSuggestions(matches)
    // Separate duplicate detection: looks specifically for same-name guests
    // owned by the *other* user, prompting a link offer if found.
    const dups = findDuplicates(val, user?.uid, guests)
    setDuplicateWarning(dups.length > 0 ? dups[0] : null)
  }

  function toggleTag(tagId) {
    setSelectedTags(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    )
    setWeightOverride(false)
  }

  async function handleSave() {
    if (!name.trim()) return
    try {
      // isGroup: true → include headcount fields; false → omit adultCount/kidCount
      // (groupNotes is preserved even for non-groups so it can be kept as a plain note)
      const groupFields = isGroup
        ? { isGroup: true, adultCount, kidCount, groupNotes }
        : { groupNotes }

      await addDoc(collection(db, 'guests'), {
        name: name.trim(),
        ownerId: user.uid,
        ownerRole: getOwnerRole(role),
        createdByRole: role,
        tags: selectedTags,
        weight: effectiveWeight,
        weightOverride,
        // linkedGuestId links to the same person in the partner's list (set via duplicate prompt)
        linkedGuestId: linkedGuestId || null,
        ...groupFields,
        rsvp: {
          hansen: { saveTheDateSent: false, inviteSent: false },
          lavita: { saveTheDateSent: false, inviteSent: false },
          confirmed: false,
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      setToast(`${name.trim()} added`)
      setName('')
      setSelectedTags([])
      setWeightOverride(false)
      setOverrideValue(null)
      setLinkedGuestId(null)
      setSuggestions([])
      setDuplicateWarning(null)
      setIsGroup(false)
      setAdultCount(1)
      setKidCount(0)
      setGroupNotes('')
      nameRef.current?.focus()
    } catch (err) {
      setToast('Failed to save. Try again.')
    }
  }

  async function handleAddNewTag() {
    if (!newTagName.trim()) return
    try {
      await addDoc(collection(db, 'tags'), {
        name: newTagName.trim(),
        createdBy: user.uid,
        createdByInitial: getOwnerRole(role) === 'hansen' ? 'H' : 'L',
        weights: { [user.uid]: 5 },
        color: '#f0e8ff',
      })
      setNewTagName('')
      setAddingTag(false)
    } catch (err) {
      console.error('Failed to save tag:', err)
    }
  }

  return (
    <div className="p-4 space-y-4">
      {/* Name input */}
      <div>
        <input
          ref={nameRef}
          type="text"
          placeholder="Guest name..."
          value={name}
          onChange={e => handleNameChange(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
        />
        {/* Suggestions dropdown */}
        {suggestions.length > 0 && (
          <div className="border border-purple-200 rounded-lg mt-1 bg-white shadow-sm overflow-hidden">
            {(suggestionsExpanded ? suggestions : suggestions.slice(0, 5)).map(g => {
              const gTags = (g.tags || []).map(id => tags.find(t => t.id === id)).filter(Boolean)
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => { setName(g.name); setSuggestions([]) }}
                  className="w-full text-left px-3 py-2 text-sm border-b last:border-0 border-gray-100 hover:bg-purple-50 flex items-center justify-between"
                >
                  <span>{g.name} {gTags.map(t => <span key={t.id} className="text-xs px-1.5 py-0.5 rounded-full ml-1" style={{ backgroundColor: t.color }}>{t.name}</span>)}</span>
                  <span className="text-xs text-purple-500">{g.ownerId === user?.uid ? 'Your list' : 'Their list'}</span>
                </button>
              )
            })}
            {!suggestionsExpanded && suggestions.length > 5 && (
              <button
                type="button"
                onClick={() => setSuggestionsExpanded(true)}
                className="w-full text-center px-3 py-2 text-xs text-purple-500 font-medium border-t border-gray-100 hover:bg-purple-50"
              >
                See {suggestions.length - 5} more
              </button>
            )}
          </div>
        )}
        {/* Duplicate warning */}
        {duplicateWarning && !linkedGuestId && (
          <div className="mt-1 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-xs text-yellow-800 flex items-center justify-between">
            <span>"{duplicateWarning.name}" exists in partner's list — same person?</span>
            <button type="button" onClick={() => setLinkedGuestId(duplicateWarning.id)} className="ml-2 text-purple-600 underline">Link</button>
          </div>
        )}
        {linkedGuestId && (
          <div className="mt-1 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs text-green-800 flex items-center justify-between">
            <span>Linked as same person ✓</span>
            <button type="button" onClick={() => setLinkedGuestId(null)} className="text-gray-500 underline">Undo</button>
          </div>
        )}
      </div>

      {/* Family / Group toggle */}
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${isGroup ? 'bg-purple-50 border-purple-200' : 'bg-gray-50 border-gray-200'}`}>
        <label htmlFor="isGroupToggle" className={`text-xs font-medium cursor-pointer select-none ${isGroup ? 'text-purple-600' : 'text-gray-500'}`}>
          👨‍👩‍👧 Family / Group
        </label>
        <input
          id="isGroupToggle"
          type="checkbox"
          aria-label="Family / Group"
          checked={isGroup}
          onChange={e => {
            setIsGroup(e.target.checked)
            if (!e.target.checked) {
              setAdultCount(1)
              setKidCount(0)
              setGroupNotes('')
            }
          }}
          className="ml-auto accent-purple-500 w-4 h-4 cursor-pointer"
        />
      </div>

      {/* Group counters (visible only when isGroup) */}
      {isGroup && (
        <div className="flex gap-3">
          {/* Adults stepper */}
          <div className="flex-1 bg-gray-50 rounded-lg px-3 py-2 text-center">
            <p className="text-xs text-gray-500 mb-1">Adults</p>
            <div className="flex items-center justify-center gap-4">
              <button type="button" aria-label="−" onClick={() => setAdultCount(c => Math.max(1, c - 1))} className="text-purple-500 font-bold text-lg leading-none">−</button>
              <span className="font-bold text-sm w-4 text-center">{adultCount}</span>
              <button type="button" aria-label="+" onClick={() => setAdultCount(c => c + 1)} className="text-purple-500 font-bold text-lg leading-none">+</button>
            </div>
          </div>
          {/* Kids stepper */}
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

      {/* Notes (always visible) */}
      <div className="bg-gray-50 rounded-lg px-3 py-2">
        <p className="text-xs text-gray-500 mb-1">Notes (optional)</p>
        <textarea
          value={groupNotes}
          onChange={e => setGroupNotes(e.target.value)}
          placeholder="e.g. John, Jane + 1 kid..."
          rows={2}
          className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-purple-300"
        />
      </div>

      {/* Tags */}
      <div>
        <p className="text-xs text-gray-500 mb-1.5">Tags</p>
        <div className="flex flex-wrap gap-2">
          {tags.map(tag => (
            <TagPill
              key={tag.id}
              tag={tag}
              selected={selectedTags.includes(tag.id)}
              onClick={() => toggleTag(tag.id)}
            />
          ))}
          {addingTag ? (
            <div className="flex items-center gap-1">
              <input
                autoFocus
                value={newTagName}
                onChange={e => setNewTagName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddNewTag()}
                placeholder="Tag name..."
                className="border border-gray-300 rounded-full px-2 py-0.5 text-xs w-24 focus:outline-none"
              />
              <button type="button" onClick={handleAddNewTag} className="text-xs text-purple-500">Add</button>
              <button type="button" onClick={() => setAddingTag(false)} className="text-xs text-gray-400">✕</button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAddingTag(true)}
              className="text-xs px-2 py-0.5 rounded-full border border-dashed border-gray-300 text-gray-500"
            >
              + new
            </button>
          )}
        </div>
      </div>

      {/* Weight */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">Weight</span>
        {editingWeight ? (
          <input
            autoFocus
            type="number"
            min="1" max="10"
            value={overrideValue ?? effectiveWeight}
            onChange={e => { setOverrideValue(Number(e.target.value)); setWeightOverride(true) }}
            onBlur={() => setEditingWeight(false)}
            className="w-14 border border-purple-300 rounded px-2 py-0.5 text-sm text-center"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditingWeight(true)}
            className="bg-purple-100 text-purple-600 font-bold px-3 py-0.5 rounded-lg text-sm"
          >
            {effectiveWeight}
          </button>
        )}
        {!weightOverride && <span className="text-xs text-gray-400">auto from tags · tap to override</span>}
        {weightOverride && <button type="button" onClick={() => { setWeightOverride(false); setOverrideValue(null) }} className="text-xs text-gray-400 underline">reset</button>}
      </div>

      {/* Save */}
      <button
        type="button"
        onClick={handleSave}
        disabled={!name.trim()}
        className="w-full bg-purple-500 text-white rounded-xl py-3 font-semibold text-sm disabled:opacity-40"
      >
        Save + Add Next
      </button>

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  )
}
