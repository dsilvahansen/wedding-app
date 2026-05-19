export default function FilterBar({ tags, activeTag, onTagChange, sortBy, onSortChange }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-white border-b border-gray-100 overflow-x-auto">
      <button
        onClick={() => onTagChange(null)}
        className={`text-xs px-3 py-1 rounded-full whitespace-nowrap ${!activeTag ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-600'}`}
      >
        All
      </button>
      {tags.map(tag => (
        <button
          key={tag.id}
          onClick={() => onTagChange(tag.id)}
          className={`text-xs px-3 py-1 rounded-full whitespace-nowrap ${activeTag === tag.id ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-600'}`}
        >
          {tag.name}
        </button>
      ))}
      <select
        value={sortBy}
        onChange={e => onSortChange(e.target.value)}
        className="ml-auto text-xs border border-gray-200 rounded px-2 py-1 text-gray-600"
      >
        <option value="weight">Weight ↓</option>
        <option value="name">Name A–Z</option>
        <option value="newest">Newest</option>
        <option value="oldest">Oldest</option>
      </select>
    </div>
  )
}
