import { useRef } from 'react'
import BottomSheet from '../ui/BottomSheet.jsx'
import { isContributor } from '../../lib/guestUtils.js'
import { buildWorkbook, buildSampleWorkbook, downloadWorkbook } from '../../lib/excelUtils.js'

/**
 * Settings bottom sheet with export, import, and sample download actions.
 * Import is hidden for contributor roles (read-only accounts).
 */
export default function SettingsSheet({ open, onClose, guests, tags, userId, role, onImportFile }) {
  const fileInputRef = useRef(null)
  const today = new Date().toISOString().split('T')[0]

  function handleExport() {
    const wb = buildWorkbook(guests, tags, userId)
    downloadWorkbook(wb, `wedding-guests-${today}.xlsx`)
    onClose()
  }

  function handleSampleDownload() {
    const wb = buildSampleWorkbook()
    downloadWorkbook(wb, 'wedding-guests-sample.xlsx')
    onClose()
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    onClose()
    onImportFile(file)
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Settings">
      <div className="flex flex-col gap-3">
        <button
          onClick={handleExport}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-purple-50 text-purple-700 text-sm font-medium"
        >
          <span className="text-base">📥</span>
          Export Excel
        </button>

        {!isContributor(role) && (
          <>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-purple-50 text-purple-700 text-sm font-medium"
            >
              <span className="text-base">📤</span>
              Import Excel
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleFileChange}
            />
          </>
        )}

        <button
          onClick={handleSampleDownload}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 text-gray-600 text-sm font-medium"
        >
          <span className="text-base">📄</span>
          Download Sample Template
        </button>
      </div>
    </BottomSheet>
  )
}
