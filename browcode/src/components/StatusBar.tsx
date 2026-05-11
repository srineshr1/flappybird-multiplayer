import { useStore } from '../store'

export default function StatusBar() {
  const cursorPosition = useStore((s) => s.cursorPosition)
  const activeTabId = useStore((s) => s.activeTabId)
  const openTabs = useStore((s) => s.openTabs)
  const rootDirName = useStore((s) => s.rootDirName)
  const diagnostics = useStore((s) => s.diagnostics)
  const togglePanel = useStore((s) => s.togglePanel)
  const toggleSidebar = useStore((s) => s.toggleSidebar)

  const activeTab = openTabs.find((t) => t.id === activeTabId)
  const language = activeTab?.language || ''

  let totalErrors = 0
  let totalWarnings = 0
  for (const d of Object.values(diagnostics)) {
    totalErrors += d.errors
    totalWarnings += d.warnings
  }

  return (
    <div className="statusbar">
      <div className="sb-item" onClick={toggleSidebar} style={{ cursor: 'pointer' }}>
        <svg width="12" height="12" fill="none" stroke="var(--purple)" strokeWidth="1.8" viewBox="0 0 24 24">
          <circle cx="6" cy="6" r="2" />
          <circle cx="6" cy="18" r="2" />
          <circle cx="18" cy="9" r="2" />
          <path d="M6 8v8M6 8c0-2 2-3 4-3h4a3 3 0 013 3" />
        </svg>
        <span className="sb-branch">{rootDirName || 'main'}</span>
      </div>
      <div className="sb-item">
        <svg width="11" height="11" fill="none" stroke="var(--red)" strokeWidth="1.8" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span className="sb-errors">{totalErrors}</span>
      </div>
      <div className="sb-item">
        <svg width="11" height="11" fill="none" stroke="var(--yellow)" strokeWidth="1.8" viewBox="0 0 24 24">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <span className="sb-warns">{totalWarnings}</span>
      </div>
      <div className="sb-spacer" />
      {activeTab && (
        <div className="sb-item">Ln {cursorPosition.line}, Col {cursorPosition.column}</div>
      )}
      <div className="sb-item">Spaces: 2</div>
      <div className="sb-item">UTF-8</div>
      {language && (
        <div className="sb-item">
          <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
          </svg>
          {language.charAt(0).toUpperCase() + language.slice(1)}
        </div>
      )}
      <div className="sb-item" onClick={togglePanel} style={{ cursor: 'pointer' }}>
        <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
          <polyline points="4 17 10 11 4 5" />
          <line x1="12" y1="19" x2="20" y2="19" />
        </svg>
      </div>
      <div className="sb-mode">BROWCODE</div>
    </div>
  )
}
