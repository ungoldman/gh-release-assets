const extend = require('util-extend')
const get = require('simple-get')
const async = require('async')
const mime = require('mime')
const progress = require('progress-stream')
const fs = require('fs')
const path = require('path')
const Emitter = require('events').EventEmitter
const pkg = require('./package.json')
const pumpify = require('pumpify')

function Upload () {
  const self = this
  const opts = this.opts
  const cb = this.cb

  if (!opts.assets || opts.assets.length === 0) return cb(new Error('Must specify at least one asset to upload'))
  if (!opts.token && !opts.auth) return cb(new Error('You must define either a token or username/password'))
  const files = []

  async.eachSeries(opts.assets, function (asset, callback) {
    const fileName = asset.name || path.basename(asset)
    asset = asset.path || asset
    const uploadUri = opts.url.split('{')[0] + '?name=' + fileName

    let stat

    try {
      stat = fs.statSync(asset)
    } catch (e) {
      return cb(e)
    }

    self.emit('upload-asset', fileName)

    const rd = fs.createReadStream(asset)

    const progressOpts = { length: stat.size, time: 100 }
    const prog = progress(progressOpts, function (p) {
      self.emit('upload-progress', fileName, p)
    })

    const form = {
      method: 'POST',
      url: uploadUri,
      headers: {
        'Content-Type': mime.getType(fileName),
        'Content-Length': stat.size,
        'User-Agent': 'gh-release-assets ' + pkg.version + ' (https://github.com/ungoldman/gh-release-assets)'
      },
      body: pumpify(rd, prog)
    }

    if (opts.token) { form.headers.Authorization = 'token ' + opts.token }
    if (opts.auth) { form.auth = opts.auth }

    get(form, function (err, res) {
      if (err) return callback(err)

      self.emit('uploaded-asset', fileName)
      files.push(fileName)
      callback()
    })
  }, function (err) {
    if (err) {
      cb(err)
    } else {
      cb(null, files)
    }
  })
}

function UploadAsset (opts, cb) {
  const Uploader = extend(new Emitter(), { upload: Upload })
  const uploader = Object.create(Uploader)
  uploader.opts = opts || {}
  uploader.cb = cb || function noop () {}
  uploader.upload()
  return uploader
}

module.exports = UploadAsset
