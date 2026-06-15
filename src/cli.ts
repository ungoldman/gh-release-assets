#!/usr/bin/env node
import { parseArgs } from 'node:util'
import uploadAssets from './index.js'

const usage = `usage: gh-release-assets --url <upload_url> [asset...]

Upload one or more assets to an existing GitHub release.

Options:
  --url <url>      GitHub release upload URL (required)
  --token <token>  GitHub token (defaults to $GITHUB_TOKEN)
  -h, --help       Show this help and exit

Assets are positional arguments: paths to the files to upload.`

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    url: { type: 'string' },
    token: { type: 'string' },
    help: { type: 'boolean', short: 'h' }
  }
})

if (values.help) {
  console.log(usage)
  process.exit(0)
}

const url = values.url
const token = values.token ?? process.env.GITHUB_TOKEN
const assets = positionals

if (!url) {
  console.error('error: --url is required\n')
  console.error(usage)
  process.exit(1)
}
if (assets.length === 0) {
  console.error('error: specify at least one asset to upload\n')
  console.error(usage)
  process.exit(1)
}
if (!token) {
  console.error('error: no token provided (pass --token or set GITHUB_TOKEN)')
  process.exit(1)
}

const isTty = process.stderr.isTTY

const emitter = uploadAssets({ url, token, assets }, (err, files) => {
  if (err) {
    console.error(err.message)
    process.exit(1)
  }
  for (const file of files ?? []) console.log(file)
  process.exit(0)
})

emitter.on('upload-asset', (name) => {
  process.stderr.write(`uploading ${name}...${isTty ? '' : '\n'}`)
})
emitter.on('upload-progress', (name, progress) => {
  if (!isTty) return
  process.stderr.write(`\ruploading ${name}... ${Math.round(progress.percentage)}%`)
})
emitter.on('uploaded-asset', (name) => {
  process.stderr.write(`${isTty ? '\r' : ''}uploaded ${name}    \n`)
})
