import { useEffect, useRef, useCallback } from 'react'
import { Terminal as XTerm } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'

const WELCOME_ASCII = `
  ██████╗ ██████╗  ██████╗ ██╗    ██╗ █████╗ ██████╗ ███████╗
  ██╔══██╗██╔══██╗██╔═══██╗██║    ██║██╔══██╗██╔══██╗██╔════╝
  ██████╔╝██████╔╝██║   ██║██║ █╗ ██║██║  ██║██║  ██║█████╗  
  ██╔══██╗██╔══██╗██║   ██║██║███╗██║██║  ██║██║  ██║██╔══╝  
  ██████╔╝██║  ██║╚██████╔╝╚███╔███╔╝╚█████╔╝██████╔╝███████╗
  ╚═════╝ ╚═╝  ╚═╝ ╚═════╝  ╚══╝╚══╝  ╚════╝ ╚═════╝ ╚══════╝
              Browser-based Code Editor v1.0.0
`

const TERM_THEME = {
  background: '#12151c',
  foreground: '#c8cdd8',
  cursor: '#5f9cff',
  cursorAccent: '#12151c',
  selectionBackground: '#5f9cff44',
  black: '#1a1e28',
  red: '#ff6b7a',
  green: '#5ce899',
  yellow: '#ffca5f',
  blue: '#5f9cff',
  magenta: '#c084fc',
  cyan: '#5ae0d4',
  white: '#c8cdd8',
  brightBlack: '#4a5168',
  brightRed: '#ff6b7a',
  brightGreen: '#5ce899',
  brightYellow: '#ffca5f',
  brightBlue: '#5f9cff',
  brightMagenta: '#c084fc',
  brightCyan: '#5ae0d4',
  brightWhite: '#ffffff',
}

// Simulated fallback
let currentDir = '/home/user'

const simulatedCommands: Record<string, (args: string[]) => string> = {
  help: () =>
    `Available commands:\r\n` +
    `  help        Show this help\r\n` +
    `  clear       Clear the terminal\r\n` +
    `  echo [msg]  Print a message\r\n` +
    `  pwd         Print working directory\r\n` +
    `  ls          List files\r\n` +
    `  cd [dir]    Change directory\r\n` +
    `  date        Show current date/time\r\n` +
    `  whoami      Show current user\r\n\r\n` +
    `  Run "npm run server" and reload for real terminal access.\r\n`,

  clear: () => '\x1bc',
  echo: (args) => args.join(' ') + '\r\n',
  pwd: () => currentDir + '\r\n',
  ls: () => {
    const files: Record<string, string[]> = {
      '/home/user': ['Documents/', 'Projects/', 'Downloads/', '.bashrc', '.gitconfig'],
    }
    const entries = files[currentDir] || ['(empty)']
    return entries.map((e) => (e.endsWith('/') ? `\x1b[34m${e}\x1b[0m` : e)).join('  ') + '\r\n'
  },
  cd: (args) => {
    if (!args[0] || args[0] === '~') currentDir = '/home/user'
    else if (args[0] === '..') {
      const parts = currentDir.split('/'); parts.pop()
      currentDir = parts.join('/') || '/'
    } else currentDir = currentDir.replace(/\/$/, '') + '/' + args[0]
    return ''
  },
  date: () => new Date().toString() + '\r\n',
  whoami: () => 'developer\r\n',
}

function createSimulatedTerminal(term: XTerm) {
  let inputBuffer = ''

  const writePrompt = () => {
    term.write(`\r\n\x1b[32m➜\x1b[0m \x1b[34m${currentDir}\x1b[0m \x1b[35mgit:(main)\x1b[0m `)
  }

  term.onData((data) => {
    const code = data.charCodeAt(0)
    if (code === 13) {
      term.write('\r\n')
      const input = inputBuffer.trim()
      inputBuffer = ''
      if (input) {
        const [cmd, ...args] = input.split(/\s+/)
        const handler = simulatedCommands[cmd]
        if (handler) {
          const output = handler(args)
          if (output) term.write(output)
        } else if (cmd) {
          term.write(`\x1b[31m${cmd}: command not found\x1b[0m\r\n`)
        }
      }
      writePrompt()
    } else if (code === 127) {
      if (inputBuffer.length > 0) { inputBuffer = inputBuffer.slice(0, -1); term.write('\b \b') }
    } else if (code >= 32) {
      inputBuffer += data; term.write(data)
    }
  })
}

export default function TerminalComponent() {
  const terminalRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<XTerm | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const fitAddonRef = useRef(new FitAddon())

  const connectWs = useCallback((term: XTerm) => {
    term.clear()
    term.write(`\x1b[33mConnecting to terminal server...\x1b[0m\r\n`)
    const WS_PORT = window.location.port === '5173' ? '3002' : window.location.port

    const ws = new WebSocket(`ws://localhost:${WS_PORT}/terminal`)
    wsRef.current = ws

    ws.onopen = () => {
      term.clear()
      const { cols, rows } = term
      ws.send(JSON.stringify({ type: 'resize', cols, rows }))
    }

    ws.onmessage = (ev) => {
      if (ev.data instanceof Blob) {
        const reader = new FileReader()
        reader.onload = () => term.write(new Uint8Array(reader.result as ArrayBuffer))
        reader.readAsArrayBuffer(ev.data)
      } else {
        term.write(ev.data)
      }
    }

    ws.onclose = () => {
      term.write(`\r\n\x1b[33m[Terminal disconnected]\x1b[0m\r\n`)
    }

    ws.onerror = () => {
      term.writeln(`\r\n\x1b[31mCannot connect to terminal server.\x1b[0m`)
      term.writeln(`\x1b[33mRun: npm run server\x1b[0m`)
      term.writeln(``)
      term.write('\x1b[32m' + WELCOME_ASCII + '\x1b[0m')
      term.write('Type \x1b[33mhelp\x1b[0m for available commands.\r\n')
      createSimulatedTerminal(term)
    }

    term.onResize(({ cols, rows }) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'resize', cols, rows }))
      }
    })

    term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data)
      }
    })
  }, [])

  useEffect(() => {
    if (!terminalRef.current || xtermRef.current) return

    const term = new XTerm({
      theme: TERM_THEME,
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
      fontSize: 13,
      lineHeight: 1.5,
      cursorBlink: true,
      cursorStyle: 'bar',
      allowProposedApi: true,
      scrollback: 5000,
      convertEol: true,
    })

    term.loadAddon(fitAddonRef.current)
    term.open(terminalRef.current)
    xtermRef.current = term

    requestAnimationFrame(() => {
      try { fitAddonRef.current.fit() } catch (_) {}
    })

    connectWs(term)

    const ro = new ResizeObserver(() => {
      try { fitAddonRef.current.fit() } catch (_) {}
    })
    ro.observe(terminalRef.current)

    return () => {
      ro.disconnect()
      try { wsRef.current?.close() } catch (_) {}
      term.dispose()
    }
  }, [connectWs])

  return <div ref={terminalRef} style={{ flex: 1, minHeight: 0 }} />
}
