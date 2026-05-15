import TagPill from './TagPill.jsx'
import RsvpIcons from './RsvpIcons.jsx'

export default function GuestRow({ guest, tags, currentRole, readOnly, onRsvpToggle, onEdit, badge }) {
  const guestTags = (guest.tags || []).map(id => tags.find(t => t.id === id)).filter(Boolean)

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 border-b border-gray-100 ${!readOnly ? 'cursor-pointer active:bg-purple-50' : ''}`}
      onClick={!readOnly ? onEdit : undefined}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className="font-medium text-sm truncate">{guest.name}</span>
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
      <RsvpIcons
        rsvp={guest.rsvp ?? { hansen: {}, lavita: {}, confirmed: false }}
        currentRole={currentRole}
        readOnly={readOnly}
        onToggle={field => onRsvpToggle(guest.id, field)}
      />
    </div>
  )
}
