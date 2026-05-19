import { useState } from 'react'
import { doc, writeBatch } from 'firebase/firestore'
import { db } from '../../firebase.js'
import { useAuth } from '../../hooks/useAuth.js'
import { useGuests } from '../../hooks/useGuests.js'
import { useTags } from '../../hooks/useTags.js'
import { getTagWeight } from '../../lib/tagUtils.js'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import TagEditSheet from './TagEditSheet.jsx'
import GuestTagAssignSheet from './GuestTagAssignSheet.jsx'

function SortableTagRow({ tag, count, myWeight, onEdit, onAssign }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: tag.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 px-3 py-3 border-b border-gray-100 bg-white"
    >
      <button
        type="button"
        aria-label="drag handle"
        className="text-gray-300 cursor-grab active:cursor-grabbing text-lg leading-none select-none touch-none"
        {...attributes}
        {...listeners}
      >
        ⠿
      </button>
      <button
        type="button"
        onClick={onEdit}
        className="flex items-center gap-3 flex-1 text-left"
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
      <button
        type="button"
        aria-label={`assign guests to ${tag.name}`}
        onClick={onAssign}
        className="text-base text-gray-400 hover:text-purple-500 px-1"
      >
        👥
      </button>
    </div>
  )
}

export default function TagsManager() {
  const { user, role } = useAuth()
  const { guests } = useGuests()
  const { tags } = useTags()
  const [localOrder, setLocalOrder] = useState(null)
  const [editingTag, setEditingTag] = useState(null)
  const [creatingTag, setCreatingTag] = useState(false)
  const [assigningTag, setAssigningTag] = useState(null)

  const displayTags = localOrder ?? tags

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  )

  function guestCountForTag(tagId) {
    return guests.filter(g => g.tags?.includes(tagId)).length
  }

  async function handleDragEnd(event) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = displayTags.findIndex(t => t.id === active.id)
    const newIndex = displayTags.findIndex(t => t.id === over.id)
    const reordered = arrayMove(displayTags, oldIndex, newIndex)
    setLocalOrder(reordered)

    const batch = writeBatch(db)
    reordered.forEach((tag, idx) => {
      batch.update(doc(db, 'tags', tag.id), { order: idx })
    })
    try {
      await batch.commit()
      setLocalOrder(null)
    } catch (err) {
      console.error('Failed to save tag order:', err)
      setLocalOrder(null)
    }
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

      {displayTags.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">No tags yet — create one above</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={displayTags.map(t => t.id)} strategy={verticalListSortingStrategy}>
            {displayTags.map(tag => (
              <SortableTagRow
                key={tag.id}
                tag={tag}
                count={guestCountForTag(tag.id)}
                myWeight={getTagWeight(tag, user?.uid)}
                onEdit={() => setEditingTag(tag)}
                onAssign={() => setAssigningTag(tag)}
              />
            ))}
          </SortableContext>
        </DndContext>
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
      {assigningTag && (
        <GuestTagAssignSheet
          tag={assigningTag}
          guests={guests}
          open={!!assigningTag}
          onClose={() => setAssigningTag(null)}
        />
      )}
    </div>
  )
}
