export default function FilterBar({ tags, activeTag, onTagChange, searchQuery, onSearchChange, showSearch }) {
  return (
    <div className="bg-white border-b border-gray-100">
      {/* Search input — always visible on md+, conditionally visible on mobile */}
      <div className={`px-3 pt-2 pb-1 ${showSearch ? '' : 'hidden md:block'}`}>
        <input
          type="text"
          value={searchQuery ?? ''}
          onChange={e => onSearchChange?.(e.target.value)}
          placeholder="Search guests..."
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-purple-400"
        />
      </div>
      {/* Tag filter pills */}
      <div className="flex items-center gap-2 px-3 py-2 overflow-x-auto">
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
      </div>
    </div>
  )
}
