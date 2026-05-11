import { useStore } from '../store'

export default function Breadcrumb() {
  const activeTabId = useStore((s) => s.activeTabId)
  const openTabs = useStore((s) => s.openTabs)

  const activeTab = openTabs.find((t) => t.id === activeTabId)

  if (!activeTab) return null

  return (
    <div className="breadcrumb">
      {activeTab.path.map((part, i) => (
        <span key={i}>
          {i > 0 && <span className="sep">/</span>}
          <span className={i === activeTab.path.length - 1 ? 'active' : ''}>
            {part}
          </span>
        </span>
      ))}
    </div>
  )
}
