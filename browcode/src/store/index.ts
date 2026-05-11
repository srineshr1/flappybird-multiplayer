import { create } from 'zustand'

export interface FileNode {
  name: string
  kind: 'file' | 'directory'
  handle: FileSystemHandle
  children?: FileNode[]
  expanded?: boolean
  loaded?: boolean
}

export interface Tab {
  id: string
  name: string
  path: string[]
  handle: FileSystemFileHandle | null
  isDirty: boolean
  content: string
  language: string
}

export interface Diagnostic {
  message: string
  severity: 'error' | 'warning' | 'info'
  line: number
  column: number
}

export interface EditorGroup {
  id: string
  tabIds: string[]
  activeTabId: string | null
}

interface FileDiagnostics {
  errors: number
  warnings: number
  items: Diagnostic[]
}

export type ActivityView = 'explorer' | 'search' | 'git' | 'debug' | 'extensions'
export type PanelTab = 'problems' | 'terminal' | 'output' | 'debug'

const INIT_GROUP = 'group-1'

interface AppState {
  rootDirHandle: FileSystemDirectoryHandle | null
  rootDirName: string
  fileTree: FileNode[]
  openTabs: Tab[]
  activeTabId: string | null
  editorGroups: EditorGroup[]
  activeGroupId: string
  activeSidebarView: ActivityView
  activePanelTab: PanelTab
  sidebarVisible: boolean
  panelVisible: boolean
  searchVisible: boolean
  searchQuery: string
  cursorPosition: { line: number; column: number }
  sidebarWidth: number
  panelHeight: number
  editorRef: React.RefObject<any> | null
  diagnostics: Record<string, FileDiagnostics>

  setDiagnostics: (path: string, d: FileDiagnostics) => void
  clearDiagnostics: (path: string) => void
  setEditorRef: (ref: React.RefObject<any>) => void
  openFolder: () => Promise<void>
  refreshTree: () => Promise<void>
  toggleFolder: (node: FileNode) => Promise<void>
  openFile: (node: FileNode, groupId?: string) => Promise<void>
  closeTab: (tabId: string, groupId?: string) => void
  setActiveTab: (tabId: string, groupId?: string) => void
  updateTabContent: (tabId: string, content: string) => void
  saveFile: (tabId?: string) => Promise<void>
  setActiveSidebarView: (view: ActivityView) => void
  setActivePanelTab: (tab: PanelTab) => void
  toggleSidebar: () => void
  togglePanel: () => void
  setSearchVisible: (v: boolean) => void
  setSearchQuery: (q: string) => void
  setCursorPosition: (pos: { line: number; column: number }) => void
  setSidebarWidth: (w: number) => void
  setPanelHeight: (h: number) => void
  splitEditor: (tabId: string, fromGroupId: string) => void
  closeGroup: (groupId: string) => void
  setActiveGroup: (groupId: string) => void
  moveTabToGroup: (tabId: string, fromGroupId: string, toGroupId: string) => void
  insertGroupAt: (tabId: string, fromGroupId: string, nearGroupId: string, side: 'before' | 'after') => void
}

function getLanguage(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase()
  const map: Record<string, string> = {
    ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
    css: 'css', scss: 'scss', html: 'html', json: 'json', md: 'markdown',
    py: 'python', rs: 'rust', go: 'go', java: 'java', c: 'c', cpp: 'cpp',
    h: 'c', hpp: 'cpp', yml: 'yaml', yaml: 'yaml', xml: 'xml', sql: 'sql',
    sh: 'shell', bash: 'shell', ps1: 'powershell', svg: 'xml', txt: 'plaintext',
    toml: 'toml', lock: 'plaintext', gitignore: 'plaintext', env: 'plaintext',
  }
  return map[ext || ''] || 'plaintext'
}

async function readDirectoryContents(dirHandle: FileSystemDirectoryHandle): Promise<FileNode[]> {
  const nodes: FileNode[] = []
  for await (const [name, handle] of (dirHandle as any).entries()) {
    if (name.startsWith('.') || name === 'node_modules') continue
    if (handle.kind === 'directory') {
      nodes.push({ name, kind: 'directory', handle, expanded: false, loaded: false })
    } else {
      nodes.push({ name, kind: 'file', handle })
    }
  }
  nodes.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'directory' ? -1 : 1
    return a.name.localeCompare(b.name)
  })
  return nodes
}

function removeTabFromGroup(group: EditorGroup, tabId: string): EditorGroup {
  const newTabIds = group.tabIds.filter((id) => id !== tabId)
  const newActive =
    group.activeTabId === tabId
      ? newTabIds[newTabIds.indexOf(tabId) - 1] ?? newTabIds[0] ?? null
      : group.activeTabId
  return { ...group, tabIds: newTabIds, activeTabId: newActive }
}

export const useStore = create<AppState>((set, get) => ({
  rootDirHandle: null,
  rootDirName: '',
  fileTree: [],
  openTabs: [],
  activeTabId: null,
  editorGroups: [{ id: INIT_GROUP, tabIds: [], activeTabId: null }],
  activeGroupId: INIT_GROUP,
  activeSidebarView: 'explorer',
  activePanelTab: 'terminal',
  sidebarVisible: true,
  panelVisible: true,
  searchVisible: false,
  searchQuery: '',
  cursorPosition: { line: 1, column: 1 },
  sidebarWidth: 260,
  panelHeight: 200,
  editorRef: null,
  diagnostics: {},

  setDiagnostics: (path, d) => set((s) => ({ diagnostics: { ...s.diagnostics, [path]: d } })),
  clearDiagnostics: (path) => set((s) => {
    const next = { ...s.diagnostics }
    delete next[path]
    return { diagnostics: next }
  }),
  setEditorRef: (ref) => set({ editorRef: ref }),

  openFolder: async () => {
    try {
      const handle = await (window as any).showDirectoryPicker()
      const children = await readDirectoryContents(handle)
      set({ rootDirHandle: handle, rootDirName: handle.name, fileTree: children, activeSidebarView: 'explorer', sidebarVisible: true })
    } catch (e) {
      if ((e as Error).name !== 'AbortError') console.error(e)
    }
  },

  refreshTree: async () => {
    const { rootDirHandle } = get()
    if (!rootDirHandle) return
    set({ fileTree: await readDirectoryContents(rootDirHandle) })
  },

  toggleFolder: async (node: FileNode) => {
    if (node.kind !== 'directory') return
    const { fileTree } = get()
    const updateNode = async (nodes: FileNode[]): Promise<FileNode[]> =>
      Promise.all(nodes.map(async (n) => {
        if (n.name === node.name && n.kind === 'directory') {
          if (n.expanded) return { ...n, expanded: false }
          if (!n.loaded) {
            const children = await readDirectoryContents(n.handle as FileSystemDirectoryHandle)
            return { ...n, expanded: true, loaded: true, children }
          }
          return { ...n, expanded: true }
        }
        if (n.children) return { ...n, children: await updateNode(n.children) }
        return n
      }))
    set({ fileTree: await updateNode(fileTree) })
  },

  openFile: async (node: FileNode, groupId?: string) => {
    if (node.kind !== 'file') return
    const { openTabs, editorGroups, activeGroupId, rootDirHandle } = get()
    const targetGroupId = groupId ?? activeGroupId
    const pathParts = [rootDirHandle?.name || '', node.name]
    const tabId = pathParts.join('/')

    let newTabs = openTabs
    if (!openTabs.find((t) => t.id === tabId)) {
      try {
        const fileHandle = node.handle as FileSystemFileHandle
        const content = await (await fileHandle.getFile()).text()
        const newTab: Tab = { id: tabId, name: node.name, path: pathParts, handle: fileHandle, isDirty: false, content, language: getLanguage(node.name) }
        newTabs = [...openTabs, newTab]
      } catch (e) {
        console.error('Failed to open file:', e)
        return
      }
    }

    const newGroups = editorGroups.map((g) => {
      if (g.id !== targetGroupId) return g
      const tabIds = g.tabIds.includes(tabId) ? g.tabIds : [...g.tabIds, tabId]
      return { ...g, tabIds, activeTabId: tabId }
    })

    set({ openTabs: newTabs, editorGroups: newGroups, activeGroupId: targetGroupId, activeTabId: tabId })
  },

  closeTab: (tabId: string, groupId?: string) => {
    const { editorGroups, activeGroupId, openTabs } = get()
    const targetGroupId = groupId ?? activeGroupId

    const newGroups = editorGroups
      .map((g) => g.id === targetGroupId ? removeTabFromGroup(g, tabId) : g)
      .filter((g, _i, arr) => g.tabIds.length > 0 || arr.length === 1)

    const stillReferenced = newGroups.some((g) => g.tabIds.includes(tabId))
    const newTabs = stillReferenced ? openTabs : openTabs.filter((t) => t.id !== tabId)

    const newActiveGroupId = newGroups.find((g) => g.id === activeGroupId)
      ? activeGroupId
      : newGroups[newGroups.length - 1]?.id ?? INIT_GROUP

    const newActiveTabId = newGroups.find((g) => g.id === newActiveGroupId)?.activeTabId ?? null

    set({ editorGroups: newGroups, openTabs: newTabs, activeGroupId: newActiveGroupId, activeTabId: newActiveTabId })
  },

  setActiveTab: (tabId: string, groupId?: string) => {
    const { editorGroups, activeGroupId } = get()
    const targetGroupId = groupId ?? activeGroupId
    const newGroups = editorGroups.map((g) =>
      g.id === targetGroupId ? { ...g, activeTabId: tabId } : g
    )
    set({ editorGroups: newGroups, activeGroupId: targetGroupId, activeTabId: tabId })
  },

  updateTabContent: (tabId: string, content: string) => {
    set({ openTabs: get().openTabs.map((t) => t.id === tabId ? { ...t, content, isDirty: true } : t) })
  },

  saveFile: async (tabId?: string) => {
    const { openTabs, activeTabId } = get()
    const id = tabId || activeTabId
    if (!id) return
    const tab = openTabs.find((t) => t.id === id)
    if (!tab?.handle) return
    try {
      const writable = await tab.handle.createWritable()
      await writable.write(tab.content)
      await writable.close()
      set({ openTabs: openTabs.map((t) => t.id === id ? { ...t, isDirty: false } : t) })
    } catch (e) { console.error('Failed to save file:', e) }
  },

  setActiveSidebarView: (view) => {
    const { activeSidebarView, sidebarVisible } = get()
    if (activeSidebarView === view && sidebarVisible) set({ sidebarVisible: false })
    else set({ activeSidebarView: view, sidebarVisible: true })
  },

  setActivePanelTab: (tab) => set({ activePanelTab: tab }),
  toggleSidebar: () => set((s) => ({ sidebarVisible: !s.sidebarVisible })),
  togglePanel: () => set((s) => ({ panelVisible: !s.panelVisible })),
  setSearchVisible: (v) => set({ searchVisible: v }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setCursorPosition: (pos) => set({ cursorPosition: pos }),
  setSidebarWidth: (w) => set({ sidebarWidth: Math.max(180, Math.min(w, 500)) }),
  setPanelHeight: (h) => set({ panelHeight: Math.max(100, Math.min(h, 500)) }),

  setActiveGroup: (groupId: string) => {
    const { editorGroups } = get()
    const group = editorGroups.find((g) => g.id === groupId)
    if (!group) return
    set({ activeGroupId: groupId, activeTabId: group.activeTabId })
  },

  splitEditor: (tabId: string, fromGroupId: string) => {
    const { editorGroups } = get()
    const fromIdx = editorGroups.findIndex((g) => g.id === fromGroupId)
    if (fromIdx === -1) return

    const newGroupId = `group-${Date.now()}`
    const updatedFrom = removeTabFromGroup(editorGroups[fromIdx], tabId)
    const newGroup: EditorGroup = { id: newGroupId, tabIds: [tabId], activeTabId: tabId }

    const newGroups = [
      ...editorGroups.slice(0, fromIdx + 1).map((g) => g.id === fromGroupId ? updatedFrom : g),
      newGroup,
      ...editorGroups.slice(fromIdx + 1),
    ]

    set({ editorGroups: newGroups, activeGroupId: newGroupId, activeTabId: tabId })
  },

  closeGroup: (groupId: string) => {
    const { editorGroups, activeGroupId } = get()
    if (editorGroups.length === 1) return
    const newGroups = editorGroups.filter((g) => g.id !== groupId)
    const newActiveGroupId = activeGroupId === groupId
      ? newGroups[newGroups.length - 1].id
      : activeGroupId
    const newActiveTabId = newGroups.find((g) => g.id === newActiveGroupId)?.activeTabId ?? null
    set({ editorGroups: newGroups, activeGroupId: newActiveGroupId, activeTabId: newActiveTabId })
  },

  moveTabToGroup: (tabId: string, fromGroupId: string, toGroupId: string) => {
    const { editorGroups } = get()
    let newGroups = editorGroups.map((g) => {
      if (g.id === fromGroupId) return removeTabFromGroup(g, tabId)
      if (g.id === toGroupId) {
        if (g.tabIds.includes(tabId)) return { ...g, activeTabId: tabId }
        return { ...g, tabIds: [...g.tabIds, tabId], activeTabId: tabId }
      }
      return g
    })
    newGroups = newGroups.filter((g, _, arr) => g.tabIds.length > 0 || arr.length === 1)
    set({ editorGroups: newGroups, activeGroupId: toGroupId, activeTabId: tabId })
  },

  insertGroupAt: (tabId: string, fromGroupId: string, nearGroupId: string, side: 'before' | 'after') => {
    const { editorGroups } = get()
    const newGroupId = `group-${Date.now()}`
    const newGroup: EditorGroup = { id: newGroupId, tabIds: [tabId], activeTabId: tabId }

    let groups = editorGroups.map((g) =>
      g.id === fromGroupId ? removeTabFromGroup(g, tabId) : g
    ).filter((g, _, arr) => g.tabIds.length > 0 || arr.length === 1)

    const nearIdx = groups.findIndex((g) => g.id === nearGroupId)
    const insertAt = nearIdx === -1 ? groups.length : (side === 'before' ? nearIdx : nearIdx + 1)

    const finalGroups = [...groups.slice(0, insertAt), newGroup, ...groups.slice(insertAt)]
    set({ editorGroups: finalGroups, activeGroupId: newGroupId, activeTabId: tabId })
  },
}))
