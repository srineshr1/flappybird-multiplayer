import { useEffect, useCallback, useRef } from 'react'
import TitleBar from './components/TitleBar'
import ActivityBar from './components/ActivityBar'
import Sidebar from './components/Sidebar'
import EditorArea from './components/EditorArea'
import Panel from './components/Panel'
import StatusBar from './components/StatusBar'
import { useStore } from './store'

function ResizeHandle({
  direction,
  onResize,
}: {
  direction: 'horizontal' | 'vertical'
  onResize: (delta: number) => void
}) {
  const dragging = useRef(false)

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      dragging.current = true
      const startPos = direction === 'horizontal' ? e.clientX : e.clientY

      const onMouseMove = (ev: MouseEvent) => {
        if (!dragging.current) return
        const currentPos = direction === 'horizontal' ? ev.clientX : ev.clientY
        onResize(currentPos - startPos)
      }

      const onMouseUp = () => {
        dragging.current = false
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }

      document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize'
      document.body.style.userSelect = 'none'
      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)
    },
    [direction, onResize]
  )

  return (
    <div
      className={`resize-handle resize-${direction}`}
      onMouseDown={onMouseDown}
    />
  )
}

export default function App() {
  const openFolder = useStore((s) => s.openFolder)
  const saveFile = useStore((s) => s.saveFile)
  const setSearchVisible = useStore((s) => s.setSearchVisible)
  const sidebarWidth = useStore((s) => s.sidebarWidth)
  const panelHeight = useStore((s) => s.panelHeight)
  const sidebarVisible = useStore((s) => s.sidebarVisible)
  const panelVisible = useStore((s) => s.panelVisible)
  const setSidebarWidth = useStore((s) => s.setSidebarWidth)
  const setPanelHeight = useStore((s) => s.setPanelHeight)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        saveFile()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
        e.preventDefault()
        openFolder()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault()
        setSearchVisible(true)
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'j') {
        e.preventDefault()
        useStore.getState().togglePanel()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault()
        useStore.getState().toggleSidebar()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [saveFile, openFolder, setSearchVisible])

  return (
    <div className="app">
      <TitleBar />
      <div className="main">
        <ActivityBar />
        {sidebarVisible && (
          <>
            <div className="sidebar" style={{ width: sidebarWidth }}>
              <Sidebar />
            </div>
            <ResizeHandle
              direction="horizontal"
              onResize={(delta) => setSidebarWidth(sidebarWidth + delta)}
            />
          </>
        )}
        <div className="content">
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <EditorArea />
            {panelVisible && (
              <ResizeHandle
                direction="vertical"
                onResize={(delta) => setPanelHeight(panelHeight - delta)}
              />
            )}
            <Panel />
          </div>
          <StatusBar />
        </div>
      </div>
    </div>
  )
}
