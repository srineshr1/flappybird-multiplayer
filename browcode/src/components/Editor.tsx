import { useRef, useCallback, useEffect } from 'react'
import Editor from '@monaco-editor/react'
import type { OnMount } from '@monaco-editor/react'
import { useStore } from '../store'

export default function CodeEditor() {
  const openTabs = useStore((s) => s.openTabs)
  const activeTabId = useStore((s) => s.activeTabId)
  const updateTabContent = useStore((s) => s.updateTabContent)
  const setSearchVisible = useStore((s) => s.setSearchVisible)
  const setCursorPosition = useStore((s) => s.setCursorPosition)
  const saveFile = useStore((s) => s.saveFile)

  const editorRef = useRef<any>(null)

  const activeTab = openTabs.find((t) => t.id === activeTabId)

  const handleMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor

    editor.onDidChangeCursorPosition((e) => {
      setCursorPosition({
        line: e.position.lineNumber,
        column: e.position.column,
      })
    })

    editor.addAction({
      id: 'save-file',
      label: 'Save File',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
      run: () => saveFile(),
    })

    editor.addAction({
      id: 'find-in-file',
      label: 'Find',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF],
      run: () => {
        setSearchVisible(true)
        editor.getAction('actions.find')?.run()
      },
    })
  }, [saveFile, setCursorPosition, setSearchVisible])

  useEffect(() => {
    if (!editorRef.current) return
    const editor = editorRef.current
    editor.getAction('actions.find')?.run()
    setSearchVisible(false)
  }, [setSearchVisible])

  if (!activeTab) {
    return <WelcomeScreen />
  }

  return (
    <div className="editor-wrap">
      <Editor
        height="100%"
        language={activeTab.language}
        value={activeTab.content}
        theme="vs-dark"
        path={activeTab.id}
        onMount={handleMount}
        onChange={(value) => {
          if (value !== undefined) {
            updateTabContent(activeTab.id, value)
          }
        }}
        options={{
          fontSize: 14,
          fontFamily:
            "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace",
          fontLigatures: true,
          lineNumbers: 'on',
          minimap: { enabled: true, scale: 1, showSlider: 'mouseover' },
          scrollBeyondLastLine: false,
          wordWrap: 'off',
          padding: { top: 12 },
          renderLineHighlight: 'line',
          cursorBlinking: 'expand',
          cursorSmoothCaretAnimation: 'on',
          smoothScrolling: true,
          bracketPairColorization: { enabled: true },
          automaticLayout: true,
          tabSize: 2,
          guides: { indentation: true, bracketPairs: true },
          suggest: { showWords: false },
          lineDecorationsWidth: 8,
          glyphMargin: false,
          folding: true,
          foldingStrategy: 'indentation',
          overviewRulerBorder: false,
          hideCursorInOverviewRuler: true,
          overviewRulerLanes: 0,
        }}
        loading={
          <div className="editor-loading">
            <div className="spinner" />
          </div>
        }
      />
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
          <button className="open-folder-btn welcome-btn" onClick={openFolder}>
            Open Folder
          </button>
        ) : (
          <p className="welcome-subtitle" style={{ color: 'var(--text2)' }}>
            Select a file from the Explorer to start editing.
          </p>
        )}
        <div className="welcome-shortcuts">
          <div className="shortcut-row">
            <kbd>Ctrl+S</kbd> <span>Save</span>
          </div>
          <div className="shortcut-row">
            <kbd>Ctrl+F</kbd> <span>Find</span>
          </div>
          <div className="shortcut-row">
            <kbd>Ctrl+P</kbd> <span>Command Palette</span>
          </div>
        </div>
      </div>
    </div>
  )
}
