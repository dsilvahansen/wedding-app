// showInitial: pass false to suppress the H/L creator superscript (e.g. on own list)
export default function TagPill({ tag, selected, onClick, showInitial = true }) {
  const bg = selected ? '#9b59b6' : tag.color || '#f0e8ff'
  const textColor = selected ? '#ffffff' : '#9b59b6'

  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-baseline gap-0.5 px-2 py-0.5 rounded-full text-xs transition-colors"
      style={{ backgroundColor: bg, color: textColor }}
    >
      {tag.name}
      {showInitial && tag.createdByInitial && (
        <sup className="text-[8px] opacity-70">{tag.createdByInitial}</sup>
      )}
    </button>
  )
}
