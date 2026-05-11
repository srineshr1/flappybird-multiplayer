import { useRef, useEffect, useState } from 'react'
import { useStore } from '../store'
import type { FileNode } from '../store'

export default function Sidebar() {
  const activeView = useStore((s) => s.activeSidebarView)

  return (
    <>
      {activeView === 'explorer' && <ExplorerPanel />}
      {activeView === 'search' && <SearchPanel />}
      {activeView === 'git' && <GitPanel />}
      {activeView === 'debug' && <DebugPanel />}
      {activeView === 'extensions' && <ExtensionsPanel />}
    </>
  )
}

function ExplorerPanel() {
  const rootDirName = useStore((s) => s.rootDirName)
  const fileTree = useStore((s) => s.fileTree)
  const openFolder = useStore((s) => s.openFolder)
  const refreshTree = useStore((s) => s.refreshTree)

  return (
    <>
      <div className="sidebar-header">
        <span className="sidebar-header-title">EXPLORER</span>
        <div className="sidebar-header-actions">
          <button className="sh-btn" title="Refresh" onClick={refreshTree}>
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
            </svg>
          </button>
        </div>
      </div>
      <div className="tree">
        {!rootDirName ? (
          <div className="tree-empty">
            <p>No folder opened</p>
            <button className="open-folder-btn" onClick={openFolder}>
              Open Folder
            </button>
          </div>
        ) : (
          <>
            <FolderSection name={rootDirName} open={true} depth={0} onToggle={() => {}}>
              {fileTree.map((node, i) => (
                <TreeNodeView key={node.name} node={node} depth={1} isLast={i === fileTree.length - 1} />
              ))}
            </FolderSection>
          </>
        )}
      </div>
    </>
  )
}

function FolderSection({
  name,
  open,
  depth,
  onToggle,
  children,
}: {
  name: string
  open: boolean
  depth: number
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <>
      <div
        className={`tree-section${open ? ' open' : ''}`}
        style={{ paddingLeft: 10 + depth * 14 }}
        onClick={onToggle}
      >
        <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor">
          <polygon points="0,0 8,4 0,8" />
        </svg>
        <svg width="14" height="14" fill="none" stroke="var(--yellow)" strokeWidth="1.6" viewBox="0 0 24 24">
          <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        </svg>
        <span style={{ color: 'var(--yellow)' }}>{name}</span>
      </div>
      {open && <div>{children}</div>}
    </>
  )
}

function TreeNodeView({ node, depth, isLast }: { node: FileNode; depth: number; isLast?: boolean }) {
  const toggleFolder = useStore((s) => s.toggleFolder)
  const openFile = useStore((s) => s.openFile)
  const activeTabId = useStore((s) => s.activeTabId)
  const rootDirName = useStore((s) => s.rootDirName)

  const tabId = (rootDirName || '') + '/' + node.name
  const isActive = activeTabId === tabId

  const indentGuides: React.ReactNode[] = []
  for (let i = 1; i < depth; i++) {
    indentGuides.push(
      <span
        key={`guide-${i}`}
        className="indent-guide"
        style={{ left: 24 + i * 16 - 8 }}
      />
    )
  }
  indentGuides.push(
    <span
      key="connector"
      className={`indent-connector${isLast ? ' last' : ''}`}
      style={{ left: 24 + depth * 16 - 8 }}
    />
  )

  if (node.kind === 'directory') {
    const isExpanded = node.expanded ?? false
    const children = node.children || []
    return (
      <>
        <div
          className="tree-folder"
          style={{ paddingLeft: 24 + depth * 16 }}
          onClick={() => toggleFolder(node)}
        >
          {indentGuides}
          <svg
            className={`tree-chevron${isExpanded ? ' expanded' : ''}`}
            width="10" height="10" viewBox="0 0 10 10" fill="currentColor"
          >
            <path d="M3 1L8 5L3 9z" />
          </svg>
          <svg width="13" height="13" fill="none" stroke="var(--yellow)" strokeWidth="1.6" viewBox="0 0 24 24">
            <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          </svg>
          <span className="fname">{node.name}</span>
        </div>
        <AnimateHeight open={isExpanded}>
          {children.map((child, i) => (
            <TreeNodeView
              key={child.name}
              node={child}
              depth={depth + 1}
              isLast={i === children.length - 1}
            />
          ))}
        </AnimateHeight>
      </>
    )
  }

  return (
    <div
      className={`tree-item${isActive ? ' active' : ''}`}
      style={{ paddingLeft: 24 + depth * 16 }}
      onClick={() => openFile(node)}
    >
      {indentGuides}
      <svg
        className="fi"
        width="13"
        height="13"
        fill="none"
        stroke={isActive ? 'var(--accent)' : 'var(--teal)'}
        strokeWidth="1.6"
        viewBox="0 0 24 24"
      >
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14,2 14,8 20,8" />
      </svg>
      <span className="fname">{node.name}</span>
    </div>
  )
}

function AnimateHeight({ open, children }: { open: boolean; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [animHeight, setAnimHeight] = useState<number | null>(null)
  const prevOpen = useRef(open)

  useEffect(() => {
    if (!ref.current) return
    const el = ref.current
    const changed = prevOpen.current !== open
    prevOpen.current = open

    if (!changed && open) {
      setAnimHeight(el.scrollHeight)
      return
    }
    if (!changed) return

    if (open) {
      const sh = el.scrollHeight
      setAnimHeight(0)
      const frame = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setAnimHeight(sh)
        })
      })
      return () => cancelAnimationFrame(frame)
    }

    setAnimHeight(el.scrollHeight || animHeight)
    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setAnimHeight(0)
      })
    })
    return () => cancelAnimationFrame(frame)
  }, [open, children])

  const styleHeight = animHeight !== null ? animHeight : open ? 'auto' : 0

  return (
    <div
      ref={ref}
      style={{
        height: styleHeight,
        overflow: 'hidden',
        transition: 'height 0.2s ease',
      }}
    >
      {children}
    </div>
  )
}

function SearchPanel() {
  return (
    <>
      <div className="sidebar-header">
        <span className="sidebar-header-title">SEARCH</span>
      </div>
      <div className="tree-empty" style={{ padding: '20px' }}>
        <p style={{ color: 'var(--text3)', fontSize: '12px' }}>
          Search across files
        </p>
      </div>
    </>
  )
}

function GitPanel() {
  return (
    <>
      <div className="sidebar-header">
        <span className="sidebar-header-title">SOURCE CONTROL</span>
      </div>
      <div className="tree-empty" style={{ padding: '20px' }}>
        <p style={{ color: 'var(--text3)', fontSize: '12px' }}>
          No source control providers registered.
        </p>
      </div>
    </>
  )
}

function DebugPanel() {
  return (
    <>
      <div className="sidebar-header">
        <span className="sidebar-header-title">RUN AND DEBUG</span>
      </div>
      <div className="tree-empty" style={{ padding: '20px' }}>
        <p style={{ color: 'var(--text3)', fontSize: '12px' }}>
          No debug configuration.
        </p>
      </div>
    </>
  )
}

function ExtensionsPanel() {
  return (
    <>
      <div className="sidebar-header">
        <span className="sidebar-header-title">EXTENSIONS</span>
      </div>
      <div className="tree-empty" style={{ padding: '20px' }}>
        <p style={{ color: 'var(--text3)', fontSize: '12px' }}>
          No extensions installed.
        </p>
      </div>
    </>
  )
}
