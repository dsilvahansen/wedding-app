function IconButton({ title, emoji, active, partnerActive, field, readOnly, onToggle, currentInitial, partnerInitial }) {
  const isConfirmed = field === 'confirmed'
  const opacity = active ? 'opacity-100' : 'opacity-25'

  return (
    <button
      title={title}
      type="button"
      disabled={readOnly}
      onClick={() => !readOnly && onToggle(field)}
      className={`flex flex-col items-center ${opacity} ${readOnly ? 'cursor-default' : 'cursor-pointer'}`}
    >
      <span className="text-base leading-none">{emoji}</span>
      {!isConfirmed && (
        <span className="text-[8px] leading-none text-gray-400">
          {active ? currentInitial : '·'}{partnerActive ? partnerInitial : '·'}
        </span>
      )}
    </button>
  )
}

export default function RsvpIcons({ rsvp, currentRole, readOnly, onToggle }) {
  const partnerRole = currentRole === 'hansen' ? 'lavita' : 'hansen'
  const partnerInitial = currentRole === 'hansen' ? 'L' : 'H'
  const currentInitial = currentRole === 'hansen' ? 'H' : 'L'

  const currentStd = rsvp[currentRole]?.saveTheDateSent
  const partnerStd = rsvp[partnerRole]?.saveTheDateSent
  const currentInvite = rsvp[currentRole]?.inviteSent
  const partnerInvite = rsvp[partnerRole]?.inviteSent

  return (
    <div className="flex gap-1 items-center">
      <IconButton title="Save the date" emoji="📅" active={currentStd} partnerActive={partnerStd} field="saveTheDateSent" readOnly={readOnly} onToggle={onToggle} currentInitial={currentInitial} partnerInitial={partnerInitial} />
      <IconButton title="Invite" emoji="✉️" active={currentInvite} partnerActive={partnerInvite} field="inviteSent" readOnly={readOnly} onToggle={onToggle} currentInitial={currentInitial} partnerInitial={partnerInitial} />
      <IconButton title="Confirmed" emoji="✅" active={rsvp.confirmed} partnerActive={false} field="confirmed" readOnly={readOnly} onToggle={onToggle} currentInitial={currentInitial} partnerInitial={partnerInitial} />
    </div>
  )
}
