import { useRef } from 'react'
import TagPill from './TagPill.jsx'
import RsvpIcons from './RsvpIcons.jsx'
import { getTotalHeadcount } from '../../lib/guestUtils.js'

export default function GuestRow({ guest, tags, currentRole, readOnly, onRsvpToggle, onEdit, badge, selectionMode = false, selected = false, onLongPress }) {
  const guestTags = (guest.tags || []).map(id => tags.find(t => t.id === id)).filter(Boolean)
  const timerRef = useRef(null)

  function handlePointerDown() {
    if (readOnly || !onLongPress) return
    timerRef.current = setTimeout(() => {
      onLongPress()
    }, 500)
  }

  function handlePointerUp() {
    clearTimeout(timerRef.current)
  }

  return (
    <div
      data-testid="guest-row"
      className={`flex items-center gap-2 px-3 py-2 border-b border-gray-100 ${!readOnly || selectionMode ? 'cursor-pointer active:bg-purple-50' : ''}`}
      onClick={!readOnly || selectionMode ? onEdit : undefined}
      onMouseDown={handlePointerDown}
      onMouseUp={handlePointerUp}
      onTouchStart={handlePointerDown}
      onTouchEnd={handlePointerUp}
    >
      {selectionMode && (
        <input type="checkbox" readOnly checked={selected} className="accent-purple-500 w-4 h-4 shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className="font-medium text-sm truncate">{guest.name}</span>
          {guest.isGroup && (
            <span className="text-xs text-gray-500 font-medium">
              ({getTotalHeadcount(guest)})
            </span>
          )}
          {badge && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={badge.style}>{badge.label}</span>
          )}
        </div>
        <div className="flex flex-wrap gap-1 mt-0.5">
          {guestTags.map(tag => (
            <TagPill key={tag.id} tag={tag} />
          ))}
        </div>
      </div>
      <span className="text-purple-500 font-bold text-sm w-5 text-center">{guest.weight}</span>
      {!selectionMode && (
        <RsvpIcons
          rsvp={guest.rsvp ?? { hansen: {}, lavita: {}, confirmed: false }}
          currentRole={currentRole}
          readOnly={readOnly}
          onToggle={field => onRsvpToggle(guest.id, field)}
        />
      )}
    </div>
  )
}
