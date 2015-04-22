var extend = require('util-extend')
var request = require('request')
var async = require('async')
var mime = require('mime')
var progress = require('progress-stream')
var fs = require('fs')
var path = require('path')
var Emitter = require('events').EventEmitter
var pkg = require('./package.json')

function Upload () {
  var self = this
  var opts = this.opts
  var cb = this.cb

  if (!opts.assets || opts.assets.length === 0) return cb([])

  var files = []

  async.eachSeries(opts.assets, function (asset, callback) {
    var fileName = asset.name || path.basename(asset)
    asset = asset.path || asset
    var uploadUri = opts.url.split('{')[0] + '?name=' + fileName
    self.emit('upload-asset', fileName)

    var stat = fs.statSync(asset)
    var rd = fs.createReadStream(asset)
    var us = request({
      method: 'POST',
      uri: uploadUri,
      headers: {
        'Authorization': 'token ' + opts.token,
        'Content-Type': mime.lookup(fileName),
        'Content-Length': stat.size,
        'User-Agent': 'publish-release ' + pkg.version + ' (https://github.com/paulcpederson/gh-release-assets)'
      }
    })

    var progressOpts = { length: stat.size, time: 100 }
    var prog = progress(progressOpts, function (p) {
      self.emit('upload-progress', fileName, p)
    })

    rd.on('error', callback)
    us.on('error', callback)

    us.on('end', function () {
      self.emit('uploaded-asset', fileName)
      files.push(fileName)
      callback()
    })

    rd.pipe(prog).pipe(us)
  }, function (err) {
    if (err) {
      cb(err)
    } else {
      cb(null, files)
    }
  })
}

function UploadAsset (opts, cb) {
  var Uploader = extend(new Emitter(), {upload: Upload})
  Uploader.opts = opts || {}
  Uploader.cb = cb || function noop () {}
  Uploader.upload()
  return Uploader
}

module.exports = UploadAsset
