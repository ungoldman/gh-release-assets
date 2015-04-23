var ghReleaseAssets = require('../')
var pkg = require('../package.json')
var request = require('request')
var format = require('util').format
var path = require('path')
var test = require('tape')
var fixture = path.join.bind(null, __dirname, 'fixtures')

var TOKEN = process.env.TOKEN
var REPO = process.env.REPO || 'bcomnes/gh-release-test'
var RELEASE = process.env.RELEASE

function auth (assets) {
  var options = {
    url: format('https://uploads.github.com/repos/%s/releases/%s/assets{?name}', REPO, RELEASE),
    token: TOKEN,
    assets: assets
  }
  return options
}

var options = {
  url: format('https://api.github.com/repos/%s/releases/%s/assets', REPO, RELEASE),
  headers: {
    'User-Agent': format('gh-release-assets %s (https://github.com/paulcpederson/gh-release-assets)', pkg.version)
  }
}

test('should upload an asset in string format', function (t) {
  var assets = [fixture('bananas.txt')]
  ghReleaseAssets(auth(assets), function (err, files) {
    t.equal(files.length, 1)
    t.end(err)
  })
})

test('should upload an asset in object format', function (t) {
  var assets = [{
    name: 'banana.txt',
    path: fixture('bananas.txt')
  }]
  ghReleaseAssets(auth(assets), function (err, files) {
    t.equal(files.length, 1)
    t.end(err)
  })
})

test('should properly upload an asset', function (t) {
  var assets = [fixture('bananas.txt')]
  ghReleaseAssets(auth(assets), function (err, files) {
    if (err) {
      t.fail('error uploading assets')
    }
    request(options, function (err, response, body) {
      var uploads = JSON.parse(body)
      var dateFile = uploads.filter(function (upload) {
        return upload.name === 'bananas.txt'
      })
      t.equal(dateFile.length, 1)
      t.end(err)
    })
  })
})

test('should properly rename an asset in object format', function (t) {
  var fileName = Date.now() + '.txt'
  var assets = [{
    name: fileName,
    path: fixture('bananas.txt')
  }]
  ghReleaseAssets(auth(assets), function (err, files) {
    if (err) t.fail(err)
    request(options, function (err, response, body) {
      var uploads = JSON.parse(body)
      var dateFile = uploads.filter(function (upload) {
        return upload.name === fileName
      })
      t.equal(dateFile.length, 1)
      t.end(err)
    })
  })
})

test('should emit `upload-asset` event', function (t) {
  var assets = [fixture('bananas.txt')]
  var release = ghReleaseAssets(auth(assets), function (err) {
    t.end(err)
  })
  release.on('upload-asset', function (fileName) {
    t.equal(fileName, 'bananas.txt')
  })
})

test('should emit `upload-progress` events', function (t) {
  t.plan(2)
  var assets = [fixture('bananas.txt')]
  var release = ghReleaseAssets(auth(assets))
  release.on('upload-progress', function (fileName, progress) {
    t.equal(fileName, 'bananas.txt')
    t.ok(progress)
  })
})

test('should emit `uploaded-asset` event', function (t) {
  t.plan(1)
  var assets = [fixture('bananas.txt')]
  var release = ghReleaseAssets(auth(assets))
  release.on('uploaded-asset', function (fileName) {
    t.equal(fileName, 'bananas.txt')
  })
})

test('should return an error for missing files', function (t) {
  var assets = ['non-existent-bananas.txt']
  ghReleaseAssets(auth(assets), function (err, assets) {
    t.ok(err)
    t.end()
  })
})

test('should return an error if there is no token', function (t) {
  var options = {
    url: 'https://uploads.github.com/repos/bcomnes/gh-release-test/releases/1039654/assets{?name}',
    assets: [fixture('bananas.txt')]
  }
  ghReleaseAssets(options, function (err, assets) {
    t.ok(err)
    t.end()
  })
})
