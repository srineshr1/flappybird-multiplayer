import { WebSocketServer } from 'ws'
import { spawn } from 'node-pty'
import { createServer } from 'http'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { readFileSync, existsSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = process.env.PORT || 3001
const WS_PORT = process.env.WS_PORT || 3002

const isWindows = process.platform === 'win32'

function createShell() {
  if (isWindows) {
    return spawn('powershell.exe', [], {
      name: 'xterm-256color',
      cols: 80,
      rows: 24,
      cwd: process.cwd(),
      env: { ...process.env, TERM: 'xterm-256color' },
    })
  }
  return spawn('bash', ['--login'], {
    name: 'xterm-256color',
    cols: 80,
    rows: 24,
    cwd: process.cwd(),
    env: { ...process.env, TERM: 'xterm-256color' },
  })
}

// Static file server
const distPath = join(__dirname, '..', 'dist')
const httpServer = createServer((req, res) => {
  if (!req.url) { res.writeHead(400); res.end(); return }
  const url = req.url === '/' ? '/index.html' : req.url
  const filePath = join(distPath, url)

  if (existsSync(filePath)) {
    const ext = url.split('.').pop()?.toLowerCase()
    const mime = {
      html: 'text/html', css: 'text/css', js: 'application/javascript',
      json: 'application/json', svg: 'image/svg+xml', png: 'image/png',
      ico: 'image/x-icon', woff2: 'font/woff2',
    }
    res.writeHead(200, { 'Content-Type': mime[ext || ''] || 'text/plain' })
    res.end(readFileSync(filePath))
  } else {
    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.end(readFileSync(join(distPath, 'index.html')))
  }
})

// WebSocket server for terminals
const wss = new WebSocketServer({ server: httpServer, path: '/terminal' })

wss.on('connection', (ws) => {
  console.log('[terminal] client connected')

  const shell = createShell()
  let disposed = false

  shell.onData((data) => {
    if (!disposed) {
      try { ws.send(data) } catch (_) {}
    }
  })

  shell.onExit(({ exitCode }) => {
    console.log(`[terminal] shell exited with code ${exitCode}`)
    disposed = true
    try { ws.close() } catch (_) {}
  })

  ws.on('message', (raw) => {
    let data
    try {
      data = JSON.parse(raw.toString())
    } catch {
      data = raw.toString()
    }

    if (typeof data === 'object' && data !== null && data.type === 'resize') {
      if (data.cols && data.rows) {
        try { shell.resize(data.cols, data.rows) } catch (_) {}
      }
      return
    }

    try { shell.write(data.toString()) } catch (_) {}
  })

  ws.on('close', () => {
    console.log('[terminal] client disconnected')
    disposed = true
    try { shell.kill() } catch (_) {}
  })

  ws.on('error', () => {
    disposed = true
    try { shell.kill() } catch (_) {}
  })
})

httpServer.listen(WS_PORT, () => {
  console.log(`\n  Terminal server running on ws://localhost:${WS_PORT}`)
  console.log(`  Static files at    http://localhost:${WS_PORT}\n`)
})
