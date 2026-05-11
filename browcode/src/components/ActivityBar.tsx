import { useStore } from '../store'
import type { ActivityView } from '../store'

const icons: { view: ActivityView; label: string; svg: React.ReactNode }[] = [
  {
    view: 'explorer',
    label: 'Explorer',
    svg: (
      <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
      </svg>
    ),
  },
  {
    view: 'search',
    label: 'Search',
    svg: (
      <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <circle cx="11" cy="11" r="7" />
        <path d="M16.5 16.5L21 21" />
      </svg>
    ),
  },
  {
    view: 'git',
    label: 'Source Control',
    svg: (
      <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <circle cx="6" cy="6" r="2" /><circle cx="6" cy="18" r="2" /><circle cx="18" cy="9" r="2" />
        <path d="M6 8v8M6 8c0-2 2-3 4-3h4a3 3 0 013 3" />
      </svg>
    ),
  },
  {
    view: 'debug',
    label: 'Debug',
    svg: (
      <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path d="M12 22a8 8 0 100-16 8 8 0 000 16z" />
        <path d="M12 8v4l3 3" />
      </svg>
    ),
  },
  {
    view: 'extensions',
    label: 'Extensions',
    svg: (
      <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <rect x="3" y="3" width="8" height="8" rx="1" />
        <rect x="13" y="3" width="8" height="8" rx="1" />
        <rect x="3" y="13" width="8" height="8" rx="1" />
        <rect x="13" y="13" width="8" height="8" rx="1" />
      </svg>
    ),
  },
]

export default function ActivityBar() {
  const activeView = useStore((s) => s.activeSidebarView)
  const setView = useStore((s) => s.setActiveSidebarView)

  return (
    <div className="activity-bar">
      {icons.map(({ view, label, svg }) => (
        <button
          key={view}
          className={`act-btn${activeView === view ? ' active' : ''}`}
          title={label}
          onClick={() => setView(view)}
        >
          {svg}
        </button>
      ))}
      <div className="act-spacer" />
    </div>
  )
}
