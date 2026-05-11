import { useState, useCallback, useRef } from 'react'
import MonacoEditor from '@monaco-editor/react'
import type { OnMount } from '@monaco-editor/react'
import { useStore } from '../store'
import type { Tab, Diagnostic } from '../store'

interface Props {
  groupId: string
}

type DropZone = 'left' | 'right' | 'center' | null

const MONACO_OPTIONS = {
  fontSize: 14,
  fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace",
  fontLigatures: true,
  lineNumbers: 'on' as const,
  minimap: { enabled: true, scale: 1, showSlider: 'mouseover' as const },
  scrollBeyondLastLine: false,
  wordWrap: 'off' as const,
  padding: { top: 12 },
  renderLineHighlight: 'line' as const,
  cursorBlinking: 'expand' as const,
  cursorSmoothCaretAnimation: 'on' as const,
  smoothScrolling: true,
  bracketPairColorization: { enabled: true },
  automaticLayout: true,
  tabSize: 2,
  guides: { indentation: true, bracketPairs: true },
  suggest: { showWords: false },
  lineDecorationsWidth: 8,
  glyphMargin: false,
  folding: true,
  foldingStrategy: 'indentation' as const,
  overviewRulerBorder: false,
  hideCursorInOverviewRuler: true,
  overviewRulerLanes: 0,
}

export default function EditorGroup({ groupId }: Props) {
  const openTabs = useStore((s) => s.openTabs)
  const editorGroups = useStore((s) => s.editorGroups)
  const activeGroupId = useStore((s) => s.activeGroupId)
  const saveFile = useStore((s) => s.saveFile)
  const setCursorPosition = useStore((s) => s.setCursorPosition)
  const setActiveTab = useStore((s) => s.setActiveTab)
  const closeTab = useStore((s) => s.closeTab)
  const setActiveGroup = useStore((s) => s.setActiveGroup)
  const moveTabToGroup = useStore((s) => s.moveTabToGroup)
  const insertGroupAt = useStore((s) => s.insertGroupAt)
  const splitEditor = useStore((s) => s.splitEditor)
  const closeGroup = useStore((s) => s.closeGroup)

  const group = editorGroups.find((g) => g.id === groupId)
  const isActive = activeGroupId === groupId
  const [dropZone, setDropZone] = useState<DropZone>(null)
  const markerListenerSet = useRef(false)

  const handleMount: OnMount = useCallback(
    (editor, monaco) => {
      editor.onDidChangeCursorPosition((e) => {
        if (useStore.getState().activeGroupId === groupId) {
          setCursorPosition({ line: e.position.lineNumber, column: e.position.column })
        }
      })
      editor.addAction({
        id: `save-${groupId}`,
        label: 'Save',
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
        run: () => saveFile(),
      })

      if (!markerListenerSet.current) {
        markerListenerSet.current = true

        monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
          noSemanticValidation: true,
          noSyntaxValidation: false,
        })
        monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
          target: monaco.languages.typescript.ScriptTarget.ESNext,
          module: monaco.languages.typescript.ModuleKind.ESNext,
          moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
          jsx: monaco.languages.typescript.JsxEmit.ReactJSX,
          allowNonTsExtensions: true,
          strict: false,
          noImplicitAny: false,
          strictNullChecks: false,
        })

        const updateDiagnostics = () => {
          const markers = monaco.editor.getModelMarkers({})
          const byResource: Record<string, Diagnostic[]> = {}
          for (const m of markers) {
            const path = m.resource.path
            if (!byResource[path]) byResource[path] = []
            byResource[path].push({
              message: m.message,
              severity: m.severity === 8 ? 'error' : m.severity === 4 ? 'warning' : 'info',
              line: m.startLineNumber,
              column: m.startColumn,
            })
          }
          const store = useStore.getState()
          // Clear diagnostics for files that no longer have markers
          for (const path of Object.keys(store.diagnostics)) {
            if (!byResource[path]) store.clearDiagnostics(path)
          }
          for (const [path, items] of Object.entries(byResource)) {
            store.setDiagnostics(path, {
              errors: items.filter((d) => d.severity === 'error').length,
              warnings: items.filter((d) => d.severity === 'warning').length,
              items,
            })
          }
        }

        updateDiagnostics()
        monaco.editor.onDidChangeMarkers(() => updateDiagnostics())
      }
    },
    [groupId, saveFile, setCursorPosition]
  )

  if (!group) return null

  const tabs = group.tabIds
    .map((id) => openTabs.find((t) => t.id === id))
    .filter((t): t is Tab => !!t)
  const activeTab = openTabs.find((t) => t.id === group.activeTabId) ?? null
  const diagnostics = useStore((s) => s.diagnostics)

  const handleTabDragStart = (e: React.DragEvent, tabId: string) => {
    e.dataTransfer.setData('browcode/tab', JSON.stringify({ tabId, fromGroupId: groupId }))
    e.dataTransfer.effectAllowed = 'move'
    document.body.classList.add('tab-dragging')
  }

  const handleTabDragEnd = () => {
    document.body.classList.remove('tab-dragging')
    setDropZone(null)
  }

  const getTabDragData = (e: React.DragEvent) => {
    try { return JSON.parse(e.dataTransfer.getData('browcode/tab')) } catch { return null }
  }

  const handleEditorDragOver = (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes('browcode/tab')) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    const rect = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    setDropZone(x < 0.25 ? 'left' : x > 0.75 ? 'right' : 'center')
  }

  const handleEditorDrop = (e: React.DragEvent) => {
    e.preventDefault()
    document.body.classList.remove('tab-dragging')
    const data = getTabDragData(e)
    const zone = dropZone
    setDropZone(null)
    if (!data || !zone) return
    const { tabId, fromGroupId } = data
    if (zone === 'center') {
      if (fromGroupId !== groupId) moveTabToGroup(tabId, fromGroupId, groupId)
    } else {
      insertGroupAt(tabId, fromGroupId, groupId, zone === 'left' ? 'before' : 'after')
    }
  }

  const handleTabBarDragOver = (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes('browcode/tab')) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDropZone('center')
  }

  const handleTabBarDrop = (e: React.DragEvent) => {
    e.preventDefault()
    document.body.classList.remove('tab-dragging')
    setDropZone(null)
    const data = getTabDragData(e)
    if (!data || data.fromGroupId === groupId) return
    moveTabToGroup(data.tabId, data.fromGroupId, groupId)
  }

  return (
    <div
      className={`editor-group${isActive ? ' active' : ''}`}
      onClick={() => !isActive && setActiveGroup(groupId)}
    >
      {/* Tab bar */}
      <div
        className="tabs-bar"
        onDragOver={handleTabBarDragOver}
        onDragLeave={() => setDropZone(null)}
        onDrop={handleTabBarDrop}
      >
        {tabs.map((tab) => {
          const diag = diagnostics[tab.id]
          const hasErrors = diag && diag.errors > 0
          return (
          <div
            key={tab.id}
            className={`tab${tab.id === group.activeTabId ? ' active' : ''}${hasErrors ? ' has-errors' : ''}`}
            onClick={(e) => { e.stopPropagation(); setActiveTab(tab.id, groupId) }}
            draggable
            onDragStart={(e) => handleTabDragStart(e, tab.id)}
            onDragEnd={handleTabDragEnd}
          >
            <svg
              width="12" height="12" fill="none"
              stroke={tab.id === group.activeTabId ? 'var(--accent)' : hasErrors ? 'var(--red)' : 'var(--teal)'}
              strokeWidth="1.6" viewBox="0 0 24 24"
            >
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <polyline points="14,2 14,8 20,8" />
            </svg>
            <span className={`tab-name${hasErrors ? ' error' : ''}`}>{tab.name}</span>
            {tab.isDirty && <div className="tab-dot" />}
            <span
              className="tab-close"
              onClick={(e) => { e.stopPropagation(); closeTab(tab.id, groupId) }}
            >
              ×
            </span>
          </div>
          )
        })}
        <div style={{ flex: 1 }} />
        <div className="editor-group-actions">
          {group.activeTabId && (
            <button
              className="tbar-btn"
              title="Split Editor Right"
              onClick={(e) => { e.stopPropagation(); splitEditor(group.activeTabId!, groupId) }}
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">
                <rect x="3" y="3" width="7" height="18" rx="1" />
                <rect x="14" y="3" width="7" height="18" rx="1" />
              </svg>
            </button>
          )}
          {editorGroups.length > 1 && (
            <button
              className="tbar-btn"
              title="Close Group"
              onClick={(e) => { e.stopPropagation(); closeGroup(groupId) }}
            >
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Breadcrumb */}
      {activeTab && (
        <div className="breadcrumb">
          {activeTab.path.map((part, i) => (
            <span key={i}>
              {i > 0 && <span className="sep">/</span>}
              <span className={i === activeTab.path.length - 1 ? 'active' : ''}>{part}</span>
            </span>
          ))}
        </div>
      )}

      {/* Editor + drop overlay */}
      <div
        className="editor-group-content"
        onDragOver={handleEditorDragOver}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropZone(null)
        }}
        onDrop={handleEditorDrop}
      >
        {activeTab ? (
          <MonacoEditor
            height="100%"
            language={activeTab.language}
            value={activeTab.content}
            theme="vs-dark"
            path={activeTab.id}
            onMount={handleMount}
            onChange={(value) => {
              if (value !== undefined) useStore.getState().updateTabContent(activeTab.id, value)
            }}
            options={MONACO_OPTIONS}
            loading={<div className="editor-loading"><div className="spinner" /></div>}
          />
        ) : (
          <WelcomeScreen />
        )}

        {/* Drop indicator */}
        {dropZone && (
          <div
            className="drop-indicator"
            style={{
              left: dropZone === 'right' ? '75%' : 0,
              width: dropZone === 'center' ? '100%' : '25%',
            }}
          />
        )}
      </div>
    </div>
  )
}

function WelcomeScreen() {
  const openFolder = useStore((s) => s.openFolder)
  const rootDirName = useStore((s) => s.rootDirName)

  return (
    <div className="welcome">
      <div className="welcome-content">
        <div className="welcome-logo">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
            <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" stroke="var(--accent)" strokeWidth="1.5" />
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="var(--accent)" strokeWidth="1.5" />
            <polyline points="14,2 14,8 20,8" stroke="var(--accent)" strokeWidth="1.5" />
            <line x1="8" y1="13" x2="16" y2="13" stroke="var(--accent)" strokeWidth="1.5" />
            <line x1="8" y1="17" x2="13" y2="17" stroke="var(--accent)" strokeWidth="1.5" />
          </svg>
        </div>
        <h1 className="welcome-title">BrowCode</h1>
        <p className="welcome-subtitle">A browser-based code editor</p>
        {!rootDirName ? (
          <button className="open-folder-btn welcome-btn" onClick={openFolder}>Open Folder</button>
        ) : (
          <p className="welcome-subtitle" style={{ color: 'var(--text2)' }}>
            Select a file from the Explorer to start editing.
          </p>
        )}
        <div className="welcome-shortcuts">
          <div className="shortcut-row"><kbd>Ctrl+S</kbd><span>Save</span></div>
          <div className="shortcut-row"><kbd>Ctrl+F</kbd><span>Find</span></div>
          <div className="shortcut-row"><kbd>Ctrl+P</kbd><span>Command Palette</span></div>
        </div>
      </div>
    </div>
  )
}
