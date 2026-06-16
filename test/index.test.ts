import assert from 'node:assert/strict'
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import type { AddressInfo } from 'node:net'
import { join } from 'node:path'
import { test } from 'node:test'
import fc from 'fast-check'
import uploadAssets, { uploadAssets as named, type UploadProgress } from '../src/index.ts'

const fixture = (name: string) => join(import.meta.dirname, 'fixtures', name)

interface Captured {
  headers: IncomingMessage['headers']
  url?: string
  bytes: number
}

interface Fixture {
  server: Server
  base: string
  requests: Captured[]
}

/** Stand up a local server mimicking the GitHub asset-upload endpoint. */
function startServer(opts: { destroy?: boolean } = {}): Promise<Fixture> {
  const requests: Captured[] = []
  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    if (opts.destroy) {
      req.socket.destroy()
      return
    }
    let bytes = 0
    req.on('data', (chunk: Buffer) => {
      bytes += chunk.length
    })
    req.on('end', () => {
      requests.push({ headers: req.headers, url: req.url, bytes })
      res.writeHead(201, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: true }))
    })
  })
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as AddressInfo
      resolve({
        server,
        base: `http://127.0.0.1:${port}/repos/o/r/releases/1/assets{?name}`,
        requests
      })
    })
  })
}

const close = (server: Server) => new Promise<void>((resolve) => server.close(() => resolve()))

// Helper wrapping the callback as a promise.
function upload(opts: Parameters<typeof uploadAssets>[0]) {
  return new Promise<{ err: Error | null; files?: string[] }>((resolve) => {
    uploadAssets(opts, (err, files) => resolve({ err, files }))
  })
}

test('exports default and named as the same function', () => {
  assert.equal(uploadAssets, named)
})

test('errors when assets array is empty', async () => {
  const { err } = await upload({ url: 'http://x/{?name}', token: 't', assets: [] })
  assert.ok(err)
  assert.equal(err?.message, 'Must specify at least one asset to upload')
})

test('errors when assets is missing', async () => {
  const { err } = await upload({
    url: 'http://x/{?name}',
    token: 't',
    assets: undefined as never
  })
  assert.ok(err)
  assert.equal(err?.message, 'Must specify at least one asset to upload')
})

test('errors when no token is provided', async () => {
  const { err } = await upload({
    url: 'http://x/{?name}',
    assets: [fixture('bananas.txt')]
  } as Parameters<typeof uploadAssets>[0])
  assert.ok(err)
  assert.equal(err?.message, 'You must provide a token')
})

test('errors on a missing file (stat error)', async () => {
  const { err } = await upload({
    url: 'http://x/{?name}',
    token: 't',
    assets: ['non-existent-bananas.txt']
  })
  assert.ok(err)
})

test('uploads a string-format asset', async () => {
  const fx = await startServer()
  const { err, files } = await upload({
    url: fx.base,
    token: 't',
    assets: [fixture('bananas.zip')]
  })
  assert.equal(err, null)
  assert.deepEqual(files, ['bananas.zip'])
  assert.equal(fx.requests[0].url, '/repos/o/r/releases/1/assets?name=bananas.zip')
  await close(fx.server)
})

test('uploads an object-format asset and renames it', async () => {
  const fx = await startServer()
  const { err, files } = await upload({
    url: fx.base,
    token: 't',
    assets: [{ name: 'renamed.txt', path: fixture('bananas.txt') }]
  })
  assert.equal(err, null)
  assert.deepEqual(files, ['renamed.txt'])
  assert.equal(fx.requests[0].url, '/repos/o/r/releases/1/assets?name=renamed.txt')
  await close(fx.server)
})

test('falls back to basename for an object asset without a name', async () => {
  const fx = await startServer()
  const { err, files } = await upload({
    url: fx.base,
    token: 't',
    assets: [{ path: fixture('bananas.txt') }]
  })
  assert.equal(err, null)
  assert.deepEqual(files, ['bananas.txt'])
  await close(fx.server)
})

test('uploads multiple assets sequentially, in order', async () => {
  const fx = await startServer()
  const { err, files } = await upload({
    url: fx.base,
    token: 't',
    assets: [fixture('bananas.txt'), fixture('bananas.zip')]
  })
  assert.equal(err, null)
  assert.deepEqual(files, ['bananas.txt', 'bananas.zip'])
  assert.deepEqual(
    fx.requests.map((r) => r.url),
    [
      '/repos/o/r/releases/1/assets?name=bananas.txt',
      '/repos/o/r/releases/1/assets?name=bananas.zip'
    ]
  )
  await close(fx.server)
})

test('emits upload-asset, upload-progress and uploaded-asset with correct payloads', async () => {
  const fx = await startServer()
  const started: string[] = []
  const finishedNames: string[] = []
  const progress: Array<{ name: string; p: UploadProgress }> = []

  const emitter = uploadAssets({ url: fx.base, token: 't', assets: [fixture('bananas.txt')] })
  emitter.on('upload-asset', (name) => started.push(name))
  emitter.on('uploaded-asset', (name) => finishedNames.push(name))
  emitter.on('upload-progress', (name, p) => progress.push({ name, p }))

  await new Promise<void>((resolve) => emitter.on('uploaded-asset', () => resolve()))

  assert.deepEqual(started, ['bananas.txt'])
  assert.deepEqual(finishedNames, ['bananas.txt'])
  assert.ok(progress.length >= 1)
  const first = progress[0]
  assert.equal(first.name, 'bananas.txt')
  assert.ok(first.p)
  for (const key of [
    'percentage',
    'transferred',
    'length',
    'remaining',
    'eta',
    'runtime',
    'delta',
    'speed'
  ] as const) {
    assert.equal(typeof first.p[key], 'number')
  }
  assert.equal(progress[progress.length - 1].p.percentage, 100)
  await close(fx.server)
})

test('sends a token Authorization header', async () => {
  const fx = await startServer()
  await upload({ url: fx.base, token: 'sekret', assets: [fixture('bananas.txt')] })
  assert.equal(fx.requests[0].headers.authorization, 'token sekret')
  await close(fx.server)
})

test('sets Content-Type, Content-Length and User-Agent headers', async () => {
  const fx = await startServer()
  await upload({ url: fx.base, token: 't', assets: [fixture('bananas.txt')] })
  const h = fx.requests[0].headers
  assert.equal(h['content-type'], 'text/plain')
  assert.equal(Number(h['content-length']), fx.requests[0].bytes)
  assert.match(String(h['user-agent']), /^gh-release-assets .+ \(https:\/\/github\.com/)
  await close(fx.server)
})

test('defaults Content-Type to octet-stream for an unknown extension', async () => {
  const fx = await startServer()
  await upload({
    url: fx.base,
    token: 't',
    assets: [{ name: 'noext', path: fixture('bananas.txt') }]
  })
  assert.equal(fx.requests[0].headers['content-type'], 'application/octet-stream')
  await close(fx.server)
})

test('surfaces a transport error to the callback', async () => {
  const fx = await startServer({ destroy: true })
  const { err } = await upload({ url: fx.base, token: 't', assets: [fixture('bananas.txt')] })
  assert.ok(err)
  await close(fx.server)
})

test('works without a callback (events-only usage)', async () => {
  const fx = await startServer()
  const emitter = uploadAssets({ url: fx.base, token: 't', assets: [fixture('bananas.txt')] })
  await new Promise<void>((resolve) => emitter.on('uploaded-asset', () => resolve()))
  assert.equal(fx.requests.length, 1)
  await close(fx.server)
})

test('uploads an empty file (no progress events, still completes)', async () => {
  const fx = await startServer()
  const progress: UploadProgress[] = []
  const { err, files } = await new Promise<{ err: Error | null; files?: string[] }>((resolve) => {
    const emitter = uploadAssets(
      { url: fx.base, token: 't', assets: [fixture('empty.txt')] },
      (e, f) => resolve({ err: e, files: f })
    )
    emitter.on('upload-progress', (_name, p) => progress.push(p))
  })
  assert.equal(err, null)
  assert.deepEqual(files, ['empty.txt'])
  assert.equal(progress.length, 0)
  await close(fx.server)
})

test('selects the https module for an https URL', async () => {
  // Point at a closed port so the request fails fast; the value here is that
  // an https URL routes through node:https rather than node:http.
  const { err } = await upload({
    url: 'https://127.0.0.1:1/repos/o/r/releases/1/assets{?name}',
    token: 't',
    assets: [fixture('bananas.txt')]
  })
  assert.ok(err)
})

test('tolerates a missing options argument', () => {
  // No callback, no options: hits the `opts ?? {}` fallback and the noop
  // default. The validation error is swallowed by the noop callback.
  assert.doesNotThrow(() => (uploadAssets as (o?: unknown) => unknown)())
})

test('property: files come back in input order for any valid asset list', async () => {
  const fx = await startServer()
  await fc.assert(
    fc.asyncProperty(
      fc.array(fc.constantFrom('bananas.txt', 'bananas.zip'), { minLength: 1, maxLength: 4 }),
      async (names) => {
        const assets = names.map((n) => ({ name: n, path: fixture(n) }))
        const { err, files } = await upload({ url: fx.base, token: 't', assets })
        assert.equal(err, null)
        assert.deepEqual(files, names)
      }
    ),
    { numRuns: 25 }
  )
  await close(fx.server)
})
