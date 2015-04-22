# gh-release-assets

[![npm][npm-image]][npm-url]
[![travis][travis-image]][travis-url]

Upload assets to a GitHub release. Based on the awesome work of [@remixz](https://github.com/remixz) as part of [publish-release](https://github.com/remixz/publish-release).

## Install

```
npm install gh-release-assets
```

## Usage

Pass in the upload url and an array of local files you'd like to upload. If you want to specify a new name for the file once it is uploaded, use an object with a `name` and `path` keys.

```js
var ghReleaseAssets = require('gh-release-assets')

ghReleaseAssets({
  url: 'https://uploads.github.com/repos/octocat/Hello-World/releases/1197692/assets{?name}',
  token: [MY_GITHUB_TOKEN],
  assets: [
    '/path/to/foo.txt',
    '/path/to/bar.zip',
    {
      name: 'baz.txt',
      path: '/path/to/baz.txt'
    }
  ]
}, function (err, assets) {
  console.log(assets)
})
```

GitHub returns the upload url in the correct format after you create a release as `upload_url`. You can also get the upload url from the `releases` endpoint like:

```
curl -i https://api.github.com/repos/:owner/:repo/releases
```

`gh-release-assets` also emits the following events:

* `upload-asset` - `{name}` - Emits before an asset file starts uploading. Emits the `name` of the file.
* `upload-progress` - `{name, progress}` - Emits while a file is uploading. Emits the `name` of the file, and a `progress` object from [`progress-stream`](https://github.com/freeall/progress-stream).
* `uploaded-asset` - `{name}` - Emits after an asset file is successfully uploaded. Emits the `name` of the file.



## Contributing

[Open-2](CONTRIBUTING.md)

## License

[ISC](LICENSE.md)

[npm-image]: https://img.shields.io/npm/v/gh-release-assets.svg?style=flat-square
[npm-url]: https://www.npmjs.com/package/gh-release-assets
[travis-image]: https://img.shields.io/travis/paulcpederson/gh-release-assets.svg?style=flat-square
[travis-url]: https://travis-ci.org/paulcpederson/gh-release-assets
