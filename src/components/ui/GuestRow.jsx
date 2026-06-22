import { useRef } from 'react'
import TagPill from './TagPill.jsx'
import { getTotalHeadcount } from '../../lib/guestUtils.js'

// Compact inline status dots — shown in both normal and select modes
// Dots are read-only in select mode; interactive in normal mode (handled by parent via onRsvpToggle)
function StatusDots({ rsvp, currentRole, readOnly, onToggle, selectMode }) {
  const partnerRole = currentRole === 'hansen' ? 'lavita' : 'hansen'
  const currentStd = rsvp[currentRole]?.saveTheDateSent
  const partnerStd = rsvp[partnerRole]?.saveTheDateSent
  const currentInvite = rsvp[currentRole]?.inviteSent
  const partnerInvite = rsvp[partnerRole]?.inviteSent
  const confirmed = rsvp.confirmed

  const dots = [
    { key: 'std', label: 'STD', active: currentStd || partnerStd, field: 'saveTheDateSent', color: currentStd ? '#a855f7' : partnerStd ? '#c084fc' : '#e5e7eb' },
    { key: 'inv', label: 'Inv', active: currentInvite || partnerInvite, field: 'inviteSent', color: currentInvite ? '#a855f7' : partnerInvite ? '#c084fc' : '#e5e7eb' },
    { key: 'conf', label: '✓', active: confirmed, field: 'confirmed', color: confirmed ? '#22c55e' : '#e5e7eb' },
  ]

  return (
    <div className="flex items-center gap-1">
      {dots.map(dot => (
        <button
          key={dot.key}
          type="button"
          disabled={readOnly || selectMode}
          onClick={e => { e.stopPropagation(); !readOnly && !selectMode && onToggle?.(dot.field) }}
          title={dot.label}
          className={`w-2 h-2 rounded-full transition-colors ${readOnly || selectMode ? 'cursor-default' : 'cursor-pointer'}`}
          style={{ backgroundColor: dot.color }}
        />
      ))}
    </div>
  )
}

export default function GuestRow({ guest, tags, currentRole, readOnly, onRsvpToggle, onEdit, badge, selectionMode = false, selected = false, onLongPress, showTagInitial = false }) {
  // Tags always visible for context when selecting
  const guestTags = (guest.tags || []).map(id => tags.find(t => t.id === id)).filter(Boolean)
  const timerRef = useRef(null)
  const longPressActivated = useRef(false)
  // Tracks the Y position where a touch started, used to detect scroll vs long-press
  const touchStartY = useRef(null)

  function handlePointerDown() {
    if (!onLongPress) return
    clearTimeout(timerRef.current)
    longPressActivated.current = false
    timerRef.current = setTimeout(() => {
      longPressActivated.current = true
      onLongPress()
    }, 500)
  }

  function handlePointerUp() {
    clearTimeout(timerRef.current)
    touchStartY.current = null
  }

  function handleTouchStart(e) {
    // Record start position without preventDefault so native scroll still works
    touchStartY.current = e.touches[0].clientY
    handlePointerDown()
  }

  function handleTouchMove(e) {
    // Cancel the long-press timer if the user scrolls more than 10px vertically
    if (touchStartY.current === null) return
    const delta = Math.abs(e.touches[0].clientY - touchStartY.current)
    if (delta > 10) {
      clearTimeout(timerRef.current)
      touchStartY.current = null
    }
  }

  function handleClick() {
    if (longPressActivated.current) {
      longPressActivated.current = false
      return
    }
    if (!readOnly || selectionMode) onEdit?.()
  }

  return (
    <div
      data-testid="guest-row"
      className={`flex items-center gap-2 px-3 py-3 border-b border-gray-100 ${!readOnly || selectionMode ? 'cursor-pointer active:bg-purple-50' : ''}`}
      onClick={handleClick}
      onMouseDown={handlePointerDown}
      onMouseUp={handlePointerUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handlePointerUp}
      onTouchCancel={handlePointerUp}
    >
      {selectionMode && (
        <input type="checkbox" readOnly checked={selected} className="accent-purple-500 w-4 h-4 shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-sm truncate">{guest.name}</span>
          {guest.isGroup && (
            <span className="text-xs text-gray-400">
              ({getTotalHeadcount(guest)})
            </span>
          )}
          {badge && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={badge.style}>{badge.label}</span>
          )}
          {/* RSVP status dots — always visible, read-only in select mode */}
          <StatusDots
            rsvp={guest.rsvp ?? { hansen: {}, lavita: {}, confirmed: false }}
            currentRole={currentRole}
            readOnly={readOnly}
            onToggle={field => onRsvpToggle(guest.id, field)}
            selectMode={selectionMode}
          />
        </div>
        {/* Tags hidden in select mode for faster scanning */}
        {guestTags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {guestTags.map(tag => (
              <TagPill key={tag.id} tag={tag} showInitial={showTagInitial} />
            ))}
          </div>
        )}
      </div>
      {/* Weight pill — hidden in select mode */}
      {!selectionMode && (
        <span className="text-[10px] font-semibold bg-purple-100 text-purple-500 px-1.5 py-0.5 rounded-full shrink-0">{guest.weight}</span>
      )}
    </div>
  )
}
