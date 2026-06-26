import { useState } from 'react'
import { useAuthContext } from '../../contexts/AuthContext.jsx'
import SettingsSheet from '../settings/SettingsSheet.jsx'
import ImportSheet from '../settings/ImportSheet.jsx'
import Toast from '../ui/Toast.jsx'

export default function TopBar({ title, guests = [], tags = [] }) {
  const { user, role, logout } = useAuthContext()
  const displayName = role === 'hansen' ? 'Hansen' : role === 'lavita' ? 'Lavita' : ''
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [importFile, setImportFile] = useState(null)
  const [toast, setToast] = useState(null)

  function handleImportSuccess({ added, updated, tagsCreated, tagsUpdated }) {
    setImportFile(null)
    const parts = []
    if (added || updated) parts.push(`${added} added, ${updated} updated`)
    if (tagsCreated || tagsUpdated) parts.push(`${tagsCreated} tags created, ${tagsUpdated} updated`)
    setToast(`Imported: ${parts.join(' · ')}`)
  }

  return (
    <>
      <div className="bg-purple-500 text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">💒</span>
          <span className="font-semibold text-sm">{title || 'Wedding Planner'}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSettingsOpen(true)}
            className="text-xs bg-purple-600 px-3 py-1 rounded-full"
            aria-label="Settings"
          >
            ⚙️
          </button>
          <button
            onClick={logout}
            className="text-xs bg-purple-600 px-3 py-1 rounded-full"
          >
            {displayName} ↩
          </button>
        </div>
      </div>

      <SettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        guests={guests}
        tags={tags}
        userId={user?.uid}
        role={role}
        onImportFile={setImportFile}
      />

      {importFile && (
        <ImportSheet
          file={importFile}
          guests={guests}
          tags={tags}
          userId={user?.uid}
          onClose={() => setImportFile(null)}
          onSuccess={handleImportSuccess}
        />
      )}

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </>
  )
}
