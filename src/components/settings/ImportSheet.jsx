import { useState, useEffect } from 'react'
import { collection, doc, writeBatch, serverTimestamp } from 'firebase/firestore'
import { db } from '../../firebase.js'
import BottomSheet from '../ui/BottomSheet.jsx'
import { parseWorkbookFromFile, sheetDataToGuests, sheetDataToTags } from '../../lib/excelUtils.js'

/**
 * ImportSheet shows a preview of what will be added/updated after parsing
 * an uploaded Excel file, then commits the changes to Firestore on confirm.
 *
 * Props:
 *   file        - File object from the file picker
 *   guests      - Current guest documents from Firestore
 *   tags        - Current tag documents from Firestore
 *   userId      - Logged-in user's Firebase UID
 *   onClose     - Called on cancel or after successful import
 *   onSuccess   - Called with { added, updated, tagsCreated, tagsUpdated } after commit
 */
export default function ImportSheet({ file, guests, tags, userId, onClose, onSuccess }) {
  const [preview, setPreview] = useState(null)
  const [parseError, setParseError] = useState(null)
  const [committing, setCommitting] = useState(false)

  useEffect(() => {
    if (!file) return
    parseWorkbookFromFile(file)
      .then(({ guestRows, tagRows }) => {
        const tagResult = sheetDataToTags(tagRows, tags, userId)
        // Merge existing + to-be-created tags so guest rows can resolve tag names
        const mergedTags = [
          ...tags,
          ...tagResult.toCreate.map((t, i) => ({ ...t, id: `__new_${i}` })),
        ]
        const guestResult = sheetDataToGuests(guestRows, guests, mergedTags)
        setPreview({ tagResult, guestResult })
      })
      .catch(err => setParseError(err.message || 'Failed to parse file'))
  }, [file])

  async function handleConfirm() {
    if (!preview) return
    setCommitting(true)
    try {
      const { tagResult, guestResult } = preview
      const batch = writeBatch(db)

      // 1. Create new tags
      const newTagIds = {}
      for (const tag of tagResult.toCreate) {
        const ref = doc(collection(db, 'tags'))
        newTagIds[tag.name.trim().toLowerCase()] = ref.id
        batch.set(ref, {
          name: tag.name,
          color: tag.color,
          weights: tag.weights,
          order: tag.order,
          createdBy: userId,
        })
      }

      // 2. Update existing tags
      for (const tag of tagResult.toUpdate) {
        const ref = doc(db, 'tags', tag.id)
        const updates = { name: tag.name }
        if (tag.color !== undefined) updates.color = tag.color
        if (tag.weightUpdate) updates[`weights.${tag.weightUpdate.uid}`] = tag.weightUpdate.value
        batch.update(ref, updates)
      }

      // Build final tag name→id map (existing + newly created)
      const tagByName = new Map([
        ...tags.map(t => [t.name.trim().toLowerCase(), t.id]),
        ...Object.entries(newTagIds),
      ])

      // Re-resolve tag IDs for guests (replacing __new_ placeholder IDs)
      function resolveTagIds(tagNames) {
        return tagNames
          .map(name => tagByName.get(name.toLowerCase()))
          .filter(Boolean)
      }

      // 3. Add new guests
      for (const guest of guestResult.toAdd) {
        const ref = doc(collection(db, 'guests'))
        // guest.tags currently holds IDs — re-resolve from names via mergedTags map
        // Actually tags are already resolved to IDs in sheetDataToGuests, but some
        // may be __new_ placeholders. Re-resolve using final tag map.
        const resolvedTags = guest.tags
          .map(id => {
            // If it's a real ID (existing tag), keep it
            if (!id.startsWith('__new_')) return id
            // Otherwise find the tag name from toCreate and get the real ID
            const idx = parseInt(id.replace('__new_', ''))
            const tagName = tagResult.toCreate[idx]?.name?.trim().toLowerCase()
            return tagName ? newTagIds[tagName] : null
          })
          .filter(Boolean)

        batch.set(ref, {
          ...guest,
          tags: resolvedTags,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      }

      // 4. Update existing guests
      for (const guest of guestResult.toUpdate) {
        const ref = doc(db, 'guests', guest.id)
        const resolvedTags = guest.tags
          .map(id => {
            if (!id.startsWith('__new_')) return id
            const idx = parseInt(id.replace('__new_', ''))
            const tagName = tagResult.toCreate[idx]?.name?.trim().toLowerCase()
            return tagName ? newTagIds[tagName] : null
          })
          .filter(Boolean)

        const { id: _id, ...updates } = guest
        batch.update(ref, { ...updates, tags: resolvedTags, updatedAt: serverTimestamp() })
      }

      await batch.commit()

      onSuccess({
        added: guestResult.toAdd.length,
        updated: guestResult.toUpdate.length,
        tagsCreated: tagResult.toCreate.length,
        tagsUpdated: tagResult.toUpdate.length,
      })
    } catch (err) {
      setParseError(err.message || 'Import failed')
      setCommitting(false)
    }
  }

  const totalErrors = [
    ...(preview?.tagResult.errors ?? []),
    ...(preview?.guestResult.errors ?? []),
  ]
  const totalWarnings = preview?.guestResult.warnings ?? []

  return (
    <BottomSheet open={!!file} onClose={onClose} title="Import Preview">
      {parseError && (
        <div className="text-red-600 text-sm mb-4 p-3 bg-red-50 rounded-lg">{parseError}</div>
      )}

      {!preview && !parseError && (
        <div className="text-gray-500 text-sm text-center py-8">Parsing file…</div>
      )}

      {preview && (
        <div className="flex flex-col gap-4">
          {/* Tags summary */}
          <Section title="Tags">
            <SummaryRow label="Create" count={preview.tagResult.toCreate.length} color="green" />
            <SummaryRow label="Update" count={preview.tagResult.toUpdate.length} color="yellow" />
            <SummaryRow label="Errors" count={preview.tagResult.errors.length} color="red" />
          </Section>

          {/* Guests summary */}
          <Section title="Guests">
            <SummaryRow label="Add" count={preview.guestResult.toAdd.length} color="green" />
            <SummaryRow label="Update" count={preview.guestResult.toUpdate.length} color="yellow" />
            <SummaryRow label="Errors" count={preview.guestResult.errors.length} color="red" />
          </Section>

          {/* Warnings */}
          {totalWarnings.length > 0 && (
            <details className="text-xs text-yellow-700">
              <summary className="cursor-pointer font-medium">{totalWarnings.length} warning(s)</summary>
              <ul className="mt-1 space-y-1 pl-3">
                {totalWarnings.map((w, i) => <li key={i}>• {w}</li>)}
              </ul>
            </details>
          )}

          {/* Errors */}
          {totalErrors.length > 0 && (
            <details className="text-xs text-red-700">
              <summary className="cursor-pointer font-medium">{totalErrors.length} row(s) skipped</summary>
              <ul className="mt-1 space-y-1 pl-3">
                {totalErrors.map((e, i) => <li key={i}>• {e}</li>)}
              </ul>
            </details>
          )}

          <div className="flex gap-2 pt-2">
            <button
              onClick={onClose}
              disabled={committing}
              className="flex-1 py-2 rounded-xl border border-gray-200 text-sm text-gray-600"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={committing || (preview.guestResult.toAdd.length === 0 && preview.guestResult.toUpdate.length === 0 && preview.tagResult.toCreate.length === 0 && preview.tagResult.toUpdate.length === 0)}
              className="flex-1 py-2 rounded-xl bg-purple-500 text-white text-sm font-medium disabled:opacity-50"
            >
              {committing ? 'Importing…' : 'Confirm Import'}
            </button>
          </div>
        </div>
      )}
    </BottomSheet>
  )
}

function Section({ title, children }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{title}</p>
      <div className="flex gap-3">{children}</div>
    </div>
  )
}

function SummaryRow({ label, count, color }) {
  const colors = {
    green: 'bg-green-50 text-green-700',
    yellow: 'bg-yellow-50 text-yellow-700',
    red: 'bg-red-50 text-red-700',
  }
  return (
    <div className={`flex-1 text-center rounded-lg py-2 text-xs font-medium ${colors[color]}`}>
      <div className="text-lg font-bold">{count}</div>
      <div>{label}</div>
    </div>
  )
}
