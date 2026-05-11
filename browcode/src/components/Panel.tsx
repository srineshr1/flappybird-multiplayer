import { useStore } from '../store'
import type { PanelTab } from '../store'
import Terminal from './Terminal'

const tabs: { id: PanelTab; label: string }[] = [
  { id: 'problems', label: 'Problems' },
  { id: 'terminal', label: 'Terminal' },
  { id: 'output', label: 'Output' },
  { id: 'debug', label: 'Debug Console' },
]

export default function Panel() {
  const panelVisible = useStore((s) => s.panelVisible)
  const activePanelTab = useStore((s) => s.activePanelTab)
  const setActivePanelTab = useStore((s) => s.setActivePanelTab)
  const togglePanel = useStore((s) => s.togglePanel)
  const panelHeight = useStore((s) => s.panelHeight)

  if (!panelVisible) return null

  return (
    <div className="panel" style={{ height: panelHeight }}>
      <div className="panel-tabs">
        {tabs.map(({ id, label }) => (
          <div
            key={id}
            className={`panel-tab${activePanelTab === id ? ' active' : ''}`}
            onClick={() => setActivePanelTab(id)}
          >
            {label}
          </div>
        ))}
        <div style={{ flex: 1 }} />
        <div className="panel-actions">
          {activePanelTab === 'terminal' && (
            <>
              <button className="tbar-btn" title="New Terminal">
                <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
              <button className="tbar-btn" title="Kill Terminal">
                <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" />
                </svg>
              </button>
            </>
          )}
          <button className="tbar-btn panel-close-btn" title="Close Panel" onClick={togglePanel}>
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>
      <div className="panel-content">
        {activePanelTab === 'terminal' && <Terminal />}
        {activePanelTab === 'problems' && <ProblemsPanel />}
        {activePanelTab === 'output' && <OutputPanel />}
        {activePanelTab === 'debug' && <DebugConsolePanel />}
      </div>
    </div>
  )
}

function ProblemsPanel() {
  const diagnostics = useStore((s) => s.diagnostics)

  const allItems = Object.entries(diagnostics).flatMap(([path, d]) =>
    d.items.map((item) => ({ ...item, path }))
  )

  if (allItems.length === 0) {
    return (
      <div style={{ padding: '10px 0' }}>
        <div style={{ color: 'var(--text3)', fontSize: 12 }}>
          No problems detected in workspace.
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '8px 0', fontSize: 12, fontFamily: 'var(--font-mono)', overflow: 'auto', height: '100%' }}>
      {allItems.map((item, i) => (
        <div
          key={i}
          style={{
            padding: '2px 12px',
            display: 'flex',
            gap: 8,
            alignItems: 'baseline',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg4)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '')}
        >
          <span style={{ color: item.severity === 'error' ? 'var(--red)' : 'var(--yellow)', flexShrink: 0 }}>
            {item.severity === 'error' ? '✕' : '⚠'}
          </span>
          <span style={{ color: 'var(--text)' }}>{item.message}</span>
          <span style={{ color: 'var(--text3)', marginLeft: 'auto', flexShrink: 0 }}>
            {item.path.split('/').pop()} {item.line}:{item.column}
          </span>
        </div>
      ))}
    </div>
  )
}

function OutputPanel() {
  return (
    <div style={{ padding: '10px 0' }}>
      <div style={{ color: 'var(--text3)', fontSize: 12 }}>
        No output.
      </div>
    </div>
  )
}

function DebugConsolePanel() {
  return (
    <div style={{ padding: '10px 0' }}>
      <div style={{ color: 'var(--text3)', fontSize: 12 }}>
        Debug console ready.
      </div>
    </div>
  )
}
