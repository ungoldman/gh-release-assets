import { EventEmitter } from 'node:events'
import { createReadStream, readFileSync } from 'node:fs'
import { stat } from 'node:fs/promises'
import { request as httpRequest } from 'node:http'
import { request as httpsRequest } from 'node:https'
import { basename } from 'node:path'
import { Transform, type TransformCallback } from 'node:stream'
import { fileURLToPath } from 'node:url'
import mime from 'mime'

const pkg = JSON.parse(
  readFileSync(fileURLToPath(new URL('../package.json', import.meta.url)), 'utf8')
) as { version: string }

/** A single asset to upload: either a path string or a `{ name, path }` object. */
export type Asset = string | { name?: string; path: string }

/** Options for {@link uploadAssets}. */
export interface UploadOptions {
  /** GitHub release upload URL, e.g. `https://uploads.github.com/...{?name}`. */
  url: string
  /** Assets to upload, as path strings or `{ name, path }` objects. */
  assets: Asset[]
  /** GitHub token (required). */
  token: string
}

/** Progress payload emitted on the `upload-progress` event. */
export interface UploadProgress {
  /** Fraction complete, 0–100. */
  percentage: number
  /** Bytes transferred so far. */
  transferred: number
  /** Total bytes to transfer. */
  length: number
  /** Bytes remaining. */
  remaining: number
  /** Estimated seconds remaining. */
  eta: number
  /** Seconds elapsed. */
  runtime: number
  /** Bytes since the previous progress event. */
  delta: number
  /** Bytes per second. */
  speed: number
}

/** Completion callback. Receives an error, or the list of uploaded filenames. */
export type UploadCallback = (err: Error | null, files?: string[]) => void

/** EventEmitter returned by {@link uploadAssets}, typed for the events it emits. */
export interface Uploader extends EventEmitter {
  on(event: 'upload-asset', listener: (name: string) => void): this
  on(event: 'upload-progress', listener: (name: string, progress: UploadProgress) => void): this
  on(event: 'uploaded-asset', listener: (name: string) => void): this
  // biome-ignore lint/suspicious/noExplicitAny: EventEmitter fallback overload
  on(event: string | symbol, listener: (...args: any[]) => void): this
}

const noop: UploadCallback = () => {}

class UploaderEmitter extends EventEmitter implements Uploader {}

function normalize(asset: Asset): { fileName: string; filePath: string } {
  if (typeof asset === 'string') {
    return { fileName: basename(asset), filePath: asset }
  }
  return { fileName: asset.name || basename(asset.path), filePath: asset.path }
}

function progressStream(length: number, onProgress: (p: UploadProgress) => void): Transform {
  const start = Date.now()
  let transferred = 0
  return new Transform({
    transform(chunk: Buffer, _enc: BufferEncoding, callback: TransformCallback) {
      const delta = chunk.length
      transferred += delta
      const runtime = (Date.now() - start) / 1000
      const remaining = length - transferred
      const speed = runtime > 0 ? transferred / runtime : 0
      // `length` is the file size, so a chunk here means length > 0.
      onProgress({
        percentage: (transferred / length) * 100,
        transferred,
        length,
        remaining,
        eta: speed > 0 ? remaining / speed : 0,
        runtime,
        delta,
        speed
      })
      callback(null, chunk)
    }
  })
}

async function uploadOne(emitter: Uploader, opts: UploadOptions, asset: Asset): Promise<string> {
  const { fileName, filePath } = normalize(asset)
  const uploadUri = `${opts.url.split('{')[0]}?name=${fileName}`
  const stats = await stat(filePath)

  return new Promise((resolve, reject) => {
    emitter.emit('upload-asset', fileName)

    const target = new URL(uploadUri)
    const requestFn = target.protocol === 'https:' ? httpsRequest : httpRequest

    const headers: Record<string, string | number> = {
      'Content-Type': mime.getType(fileName) ?? 'application/octet-stream',
      'Content-Length': stats.size,
      'User-Agent': `gh-release-assets ${pkg.version} (https://github.com/ungoldman/gh-release-assets)`
    }
    headers.Authorization = `token ${opts.token}`

    const req = requestFn(target, { method: 'POST', headers }, (res) => {
      // Drain the response so the socket frees up. Status is intentionally
      // not checked: any response counts as success (preserved behavior).
      res.on('data', () => {})
      res.on('end', () => {
        emitter.emit('uploaded-asset', fileName)
        resolve(fileName)
      })
      res.on('error', reject)
    })

    req.on('error', reject)

    const prog = progressStream(stats.size, (p) => {
      emitter.emit('upload-progress', fileName, p)
    })
    prog.on('error', reject)

    createReadStream(filePath).on('error', reject).pipe(prog).pipe(req)
  })
}

async function run(emitter: Uploader, opts: UploadOptions, cb: UploadCallback): Promise<void> {
  if (!opts.assets || opts.assets.length === 0) {
    return cb(new Error('Must specify at least one asset to upload'))
  }
  if (!opts.token) {
    return cb(new Error('You must provide a token'))
  }

  const files: string[] = []
  try {
    for (const asset of opts.assets) {
      files.push(await uploadOne(emitter, opts, asset))
    }
  } catch (err) {
    return cb(err as Error)
  }
  cb(null, files)
}

/**
 * Upload assets to a GitHub release. Returns an EventEmitter and starts
 * immediately. The optional callback receives `(err, files)`.
 */
export function uploadAssets(opts: UploadOptions, cb: UploadCallback = noop): Uploader {
  const emitter = new UploaderEmitter()
  run(emitter, opts ?? ({} as UploadOptions), cb)
  return emitter
}

export default uploadAssets
