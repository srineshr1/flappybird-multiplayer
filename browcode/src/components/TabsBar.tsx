import { useStore } from '../store'

export default function TabsBar() {
  const openTabs = useStore((s) => s.openTabs)
  const activeTabId = useStore((s) => s.activeTabId)
  const setActiveTab = useStore((s) => s.setActiveTab)
  const closeTab = useStore((s) => s.closeTab)

  if (openTabs.length === 0) return null

  return (
    <div className="tabs-bar">
      {openTabs.map((tab) => (
        <div
          key={tab.id}
          className={`tab${tab.id === activeTabId ? ' active' : ''}`}
          onClick={() => setActiveTab(tab.id)}
        >
          <svg
            width="12"
            height="12"
            fill="none"
            stroke={tab.id === activeTabId ? 'var(--accent)' : 'var(--teal)'}
            strokeWidth="1.6"
            viewBox="0 0 24 24"
          >
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <polyline points="14,2 14,8 20,8" />
          </svg>
          {tab.name}
          {tab.isDirty && <div className="tab-dot" />}
          <span
            className="tab-close"
            onClick={(e) => {
              e.stopPropagation()
              closeTab(tab.id)
            }}
          >
            ×
          </span>
        </div>
      ))}
    </div>
  )
}
