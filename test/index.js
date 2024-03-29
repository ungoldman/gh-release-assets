const ghReleaseAssets = require('../')
const format = require('util').format
const path = require('path')
const test = require('tape')
const fixture = path.join.bind(null, __dirname, 'fixtures')

const TOKEN = process.env.TOKEN
const REPO = process.env.REPO || 'ungoldman/gh-release-test'
const RELEASE = process.env.RELEASE

function auth (assets) {
  const options = {
    url: format('https://uploads.github.com/repos/%s/releases/%s/assets{?name}', REPO, RELEASE),
    token: TOKEN,
    assets: assets
  }
  return options
}

test('should return an error if no assets passed', function (t) {
  const assets = []
  ghReleaseAssets(auth(assets), function (err, assets) {
    t.ok(err)
    t.end()
  })
})

test('should return an error for missing files', function (t) {
  const assets = ['non-existent-bananas.txt']
  ghReleaseAssets(auth(assets), function (err, assets) {
    t.ok(err)
    t.end()
  })
})

test('should return an error if there is no token or auth', function (t) {
  const options = {
    url: 'https://uploads.github.com/repos/bcomnes/gh-release-test/releases/1039654/assets{?name}',
    assets: [fixture('bananas.txt')]
  }
  ghReleaseAssets(options, function (err, assets) {
    t.ok(err)
    t.end()
  })
})

test('should upload an asset in string format', function (t) {
  const assets = [fixture('bananas.zip')]
  ghReleaseAssets(auth(assets), function (err, files) {
    t.error(err)
    t.equal(files[0], 'bananas.zip')
    t.end()
  })
})

test('should upload an answer in object format', function (t) {
  const fileName = Date.now() + '.txt'
  const assets = [{
    name: fileName,
    path: fixture('bananas.txt')
  }]
  ghReleaseAssets(auth(assets), function (err, files) {
    t.error(err)
    t.equal(files[0], fileName)
    t.end()
  })
})

test('should emit `upload-asset` event', function (t) {
  const assets = [fixture('bananas.txt')]
  const release = ghReleaseAssets(auth(assets), function (err) {
    t.error(err)
    t.end()
  })
  release.on('upload-asset', function (fileName) {
    t.equal(fileName, 'bananas.txt')
  })
})

test('should emit `upload-progress` events', function (t) {
  t.plan(2)
  const assets = [fixture('bananas.txt')]
  const release = ghReleaseAssets(auth(assets))
  release.on('upload-progress', function (fileName, progress) {
    t.equal(fileName, 'bananas.txt')
    t.ok(progress)
  })
})

test('should emit `uploaded-asset` event', function (t) {
  t.plan(1)
  const assets = [fixture('bananas.txt')]
  const release = ghReleaseAssets(auth(assets))
  release.on('uploaded-asset', function (fileName) {
    t.equal(fileName, 'bananas.txt')
  })
})
