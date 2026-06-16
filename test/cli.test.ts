import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import type { AddressInfo } from 'node:net'
import { join } from 'node:path'
import { test } from 'node:test'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

// Smoke tests for the built CLI. Requires `npm run build` first (the test and
// coverage scripts build before running). The CLI is excluded from the coverage
// gate; this exercises it end to end in a subprocess against a local mock of the
// GitHub asset-upload endpoint.
const cli = join(import.meta.dirname, '..', 'dist', 'cli.js')
const fixture = (name: string) => join(import.meta.dirname, 'fixtures', name)

function startServer(): Promise<{ server: Server; base: string }> {
  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    req.on('data', () => {})
    req.on('end', () => {
      res.writeHead(201, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: true }))
    })
  })
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as AddressInfo
      resolve({ server, base: `http://127.0.0.1:${port}/repos/o/r/releases/1/assets{?name}` })
    })
  })
}

const close = (server: Server) => new Promise<void>((resolve) => server.close(() => resolve()))

test('CLI uploads an asset and prints the uploaded filename', async () => {
  const { server, base } = await startServer()
  const { stdout } = await execFileAsync('node', [
    cli,
    '--token',
    'x',
    '--url',
    base,
    fixture('bananas.txt')
  ])
  assert.equal(stdout.trim(), 'bananas.txt')
  await close(server)
})

test('CLI reads the token from GITHUB_TOKEN when --token is absent', async () => {
  const { server, base } = await startServer()
  const { stdout } = await execFileAsync('node', [cli, '--url', base, fixture('bananas.txt')], {
    env: { ...process.env, GITHUB_TOKEN: 'env-token' }
  })
  assert.equal(stdout.trim(), 'bananas.txt')
  await close(server)
})

test('CLI prints usage with --help and exits 0', async () => {
  const { stdout } = await execFileAsync('node', [cli, '--help'])
  assert.match(stdout, /usage: gh-release-assets/)
})

test('CLI exits 1 with an error when --url is missing', async () => {
  await assert.rejects(
    execFileAsync('node', [cli, '--token', 'x', fixture('bananas.txt')]),
    (err: NodeJS.ErrnoException & { code: number; stderr: string }) => {
      assert.equal(err.code, 1)
      assert.match(err.stderr, /--url is required/)
      return true
    }
  )
})

test('CLI exits 1 when no token is available', async () => {
  await assert.rejects(
    execFileAsync('node', [cli, '--url', 'http://x/{?name}', fixture('bananas.txt')], {
      env: { ...process.env, GITHUB_TOKEN: '' }
    }),
    (err: NodeJS.ErrnoException & { code: number; stderr: string }) => {
      assert.equal(err.code, 1)
      assert.match(err.stderr, /no token provided/)
      return true
    }
  )
})

test('CLI exits 1 when no assets are given', async () => {
  await assert.rejects(
    execFileAsync('node', [cli, '--token', 'x', '--url', 'http://x/{?name}']),
    (err: NodeJS.ErrnoException & { code: number; stderr: string }) => {
      assert.equal(err.code, 1)
      assert.match(err.stderr, /at least one asset/)
      return true
    }
  )
})
