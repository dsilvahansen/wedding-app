import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth.js'
import { useGuests } from '../../hooks/useGuests.js'
import { useTags } from '../../hooks/useTags.js'
import { getTagWeight } from '../../lib/tagUtils.js'
import TagEditSheet from './TagEditSheet.jsx'

export default function TagsManager() {
  const { user, role } = useAuth()
  const { guests } = useGuests()
  const { tags } = useTags()
  const [editingTag, setEditingTag] = useState(null)
  const [creatingTag, setCreatingTag] = useState(false)

  function guestCountForTag(tagId) {
    return guests.filter(g => g.tags?.includes(tagId)).length
  }

  return (
    <div>
      <div className="px-3 py-2 bg-purple-50 border-b border-purple-100 flex items-center justify-between">
        <span className="text-sm font-semibold text-purple-700">Tags</span>
        <button
          type="button"
          onClick={() => setCreatingTag(true)}
          className="text-xs bg-purple-500 text-white px-3 py-1 rounded-full"
        >
          + New Tag
        </button>
      </div>

      {tags.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">No tags yet — create one above</p>
      ) : (
        tags.map(tag => {
          const count = guestCountForTag(tag.id)
          const myWeight = getTagWeight(tag, user?.uid)
          return (
            <button
              key={tag.id}
              type="button"
              onClick={() => setEditingTag(tag)}
              className="w-full flex items-center gap-3 px-3 py-3 border-b border-gray-100 text-left hover:bg-purple-50"
            >
              <span
                className="px-3 py-1 rounded-full text-xs font-medium"
                style={{ backgroundColor: tag.color || '#f0e8ff', color: '#555' }}
              >
                {tag.name}
                {tag.createdByInitial && <sup className="text-[8px] ml-0.5 opacity-60">{tag.createdByInitial}</sup>}
              </span>
              <span className="text-xs text-gray-400 flex-1">{count} guest{count !== 1 ? 's' : ''}</span>
              <span className="text-xs font-semibold text-purple-600">w: {myWeight}</span>
            </button>
          )
        })
      )}

      {editingTag && (
        <TagEditSheet
          tag={editingTag}
          userId={user?.uid}
          role={role}
          open={!!editingTag}
          onClose={() => setEditingTag(null)}
        />
      )}
      {creatingTag && (
        <TagEditSheet
          tag={null}
          userId={user?.uid}
          role={role}
          open={creatingTag}
          onClose={() => setCreatingTag(false)}
        />
      )}
    </div>
  )
}
