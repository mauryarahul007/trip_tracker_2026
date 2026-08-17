import { defineConfig, type Plugin, type ViteDevServer, type Connect } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'node:child_process'
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import type { ServerResponse } from 'node:http'
import path from 'node:path'

const pkgVersion = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')).version

let buildSha = 'dev'
try {
  buildSha = execSync('git rev-parse --short HEAD').toString().trim()
} catch {
  // no git available — keep the 'dev' fallback
}

interface BugItem {
  id: string
  title: string
  description?: string
  severity?: string
  category?: string
  status?: string
  foundBy?: string
  environment?: Record<string, unknown>
  reproSteps?: string[]
  expectedBehavior?: string
  actualBehavior?: string
  diagnostics?: Record<string, unknown>
  createdAt?: string
  updatedAt?: string
  resolvedAt?: string
  resolvedBy?: string
  resolutionNote?: string
}

/**
 * Vite plugin providing a local REST API for bi-directional Bug Tracker sync
 * between Superadmin UI and the filesystem ledger (bugs/bugs.json + BUGS.md).
 */
function bugTrackerApiPlugin(): Plugin {
  return {
    name: 'bug-tracker-api',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req: Connect.IncomingMessage, res: ServerResponse, next: Connect.NextFunction) => {
        if (!req.url || !req.url.startsWith('/api/bugs')) {
          return next()
        }

        const bugsFile = path.resolve(process.cwd(), 'bugs', 'bugs.json')

        const readBugs = (): BugItem[] => {
          try {
            if (!existsSync(bugsFile)) return []
            return JSON.parse(readFileSync(bugsFile, 'utf-8') || '[]')
          } catch {
            return []
          }
        }

        const writeBugs = async (bugs: BugItem[]) => {
          mkdirSync(path.dirname(bugsFile), { recursive: true })
          writeFileSync(bugsFile, JSON.stringify(bugs, null, 2) + '\n', 'utf-8')
          try {
            // Dynamically load syncMarkdown without TS compile error
            const bugModule = await import('./scripts/bug.mjs' as any)
            if (bugModule?.syncMarkdown) {
              bugModule.syncMarkdown(bugs)
            }
          } catch (e) {
            console.error('Failed to sync markdown board:', e)
          }
        }

        const parseBody = (): Promise<Record<string, any>> =>
          new Promise((resolve, reject) => {
            let data = ''
            req.on('data', (chunk: Buffer | string) => (data += chunk))
            req.on('end', () => {
              try {
                resolve(data ? JSON.parse(data) : {})
              } catch (err) {
                reject(err)
              }
            })
            req.on('error', reject)
          })

        // GET /api/bugs
        if (req.method === 'GET' && (req.url === '/api/bugs' || req.url.startsWith('/api/bugs?'))) {
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(readBugs()))
          return
        }

        // POST /api/bugs
        if (req.method === 'POST' && (req.url === '/api/bugs' || req.url === '/api/bugs/')) {
          try {
            const body = await parseBody()
            const bugs = readBugs()

            let maxNum = 0
            for (const b of bugs) {
              if (b.id && typeof b.id === 'string') {
                const match = b.id.match(/^BUG-(\d+)$/i)
                if (match) {
                  const num = parseInt(match[1], 10)
                  if (num > maxNum) maxNum = num
                }
              }
            }
            const nextId = `BUG-${String(maxNum + 1).padStart(3, '0')}`
            const now = new Date().toISOString()

            const newBug: BugItem = {
              id: nextId,
              title: body.title || 'Untitled Bug',
              description: body.description || '',
              severity: body.severity || 'medium',
              category: body.category || 'general',
              status: body.status || 'open',
              foundBy: body.foundBy || 'superadmin-ui',
              environment: body.environment || {
                platform: 'web',
                isOnline: true,
                appVersion: '1.0.0',
              },
              reproSteps: Array.isArray(body.reproSteps) ? body.reproSteps : (body.reproSteps ? [body.reproSteps] : []),
              expectedBehavior: body.expectedBehavior || '',
              actualBehavior: body.actualBehavior || '',
              diagnostics: body.diagnostics || {},
              createdAt: now,
              updatedAt: now,
            }

            bugs.push(newBug)
            await writeBugs(bugs)

            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(newBug))
            return
          } catch (e: any) {
            res.statusCode = 400
            res.end(JSON.stringify({ error: e?.message || 'Error' }))
            return
          }
        }

        // PATCH /api/bugs/:id
        if (req.method === 'PATCH' && req.url.startsWith('/api/bugs/')) {
          try {
            const id = req.url.split('/api/bugs/')[1].split('?')[0]
            const body = await parseBody()
            const bugs = readBugs()
            const bug = bugs.find((b: BugItem) => b.id.toUpperCase() === id.toUpperCase())

            if (!bug) {
              res.statusCode = 404
              res.end(JSON.stringify({ error: 'Bug not found' }))
              return
            }

            if (body.status) bug.status = body.status
            if (body.severity) bug.severity = body.severity
            if (body.category) bug.category = body.category
            if (body.title) bug.title = body.title
            if (body.description !== undefined) bug.description = body.description
            if (body.resolvedBy) bug.resolvedBy = body.resolvedBy
            if (body.resolutionNote !== undefined) bug.resolutionNote = body.resolutionNote
            if (body.status === 'resolved' && !bug.resolvedAt) {
              bug.resolvedAt = new Date().toISOString()
            }
            bug.updatedAt = new Date().toISOString()

            await writeBugs(bugs)

            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(bug))
            return
          } catch (e: any) {
            res.statusCode = 400
            res.end(JSON.stringify({ error: e?.message || 'Error' }))
            return
          }
        }

        // DELETE /api/bugs/:id
        if (req.method === 'DELETE' && req.url.startsWith('/api/bugs/')) {
          try {
            const id = req.url.split('/api/bugs/')[1].split('?')[0]
            let bugs = readBugs()
            const initialLen = bugs.length
            bugs = bugs.filter((b: BugItem) => b.id.toUpperCase() !== id.toUpperCase())

            if (bugs.length === initialLen) {
              res.statusCode = 404
              res.end(JSON.stringify({ error: 'Bug not found' }))
              return
            }

            await writeBugs(bugs)

            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ success: true }))
            return
          } catch (e: any) {
            res.statusCode = 400
            res.end(JSON.stringify({ error: e?.message || 'Error' }))
            return
          }
        }

        next()
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  base: command === 'build' ? (process.env.VITE_BASE_PATH || '/trip_tracker_2026/') : '/',
  plugins: [react(), bugTrackerApiPlugin()],
  define: {
    __APP_VERSION__: JSON.stringify(pkgVersion),
    __BUILD_SHA__: JSON.stringify(buildSha),
  },
}))
