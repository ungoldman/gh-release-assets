<div align="center">

<img src="./logo.png">

# gh-release-assets

Upload assets to a GitHub release.

[![npm][npm-image]][npm-url]
[![build][build-image]][build-url]
[![downloads][downloads-image]][npm-url]

[npm-image]: https://img.shields.io/npm/v/gh-release-assets.svg
[npm-url]: https://www.npmjs.com/package/gh-release-assets
[build-image]: https://github.com/ungoldman/gh-release-assets/actions/workflows/tests.yml/badge.svg
[build-url]: https://github.com/ungoldman/gh-release-assets/actions/workflows/tests.yml
[downloads-image]: https://img.shields.io/npm/dm/gh-release-assets.svg

</div>

## Features

- Upload one or more assets to an existing GitHub release.
- Emits `upload-asset`, `upload-progress`, and `uploaded-asset` events, with progress details (percentage, bytes transferred, ETA, and more).
- Authenticates with a GitHub token.
- Usable as a library or as a command-line tool.

Based on the awesome work of [@remixz](https://github.com/remixz) as part of [publish-release](https://github.com/remixz/publish-release).

## Install

```
npm install gh-release-assets
```

## Usage

This package is ESM-only and ships TypeScript types. Import it with either the named or default export:

```js
import { uploadAssets } from 'gh-release-assets'
// or: import uploadAssets from 'gh-release-assets'
```

Pass in the upload url and an array of local files you'd like to upload. If you want to specify a new name for the file once it is uploaded, use an object with `name` and `path` keys.

```js
import { uploadAssets } from 'gh-release-assets'

uploadAssets({
  url: 'https://uploads.github.com/repos/octocat/Hello-World/releases/1197692/assets{?name}',
  token: process.env.GITHUB_TOKEN,
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

Keep your token in an environment variable rather than hardcoding it in a release script.

GitHub returns the upload url in the correct format after you create a release as `upload_url`. You can also get the upload url from the `releases` endpoint like:

```
curl -i https://api.github.com/repos/:owner/:repo/releases
```

A `token` is required.

### Events

`uploadAssets` returns an `EventEmitter` and emits the following events:

* `upload-asset` - `(name)` - Emits before an asset file starts uploading. Emits the `name` of the file.
* `upload-progress` - `(name, progress)` - Emits while a file is uploading. Emits the `name` of the file and a `progress` object (`UploadProgress`).
* `uploaded-asset` - `(name)` - Emits after an asset file is successfully uploaded. Emits the `name` of the file.

The `progress` object has these fields (all numbers), exported as the `UploadProgress` type:

```ts
interface UploadProgress {
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
```

## CLI

Installing the package provides a `gh-release-assets` command.

```
gh-release-assets --url <upload_url> [asset...]
```

Pass the release upload URL with `--url` and one or more file paths as positional arguments. Authentication uses the `--token` flag, or the `GITHUB_TOKEN` environment variable when the flag is absent.

```shell
gh-release-assets --url 'https://uploads.github.com/repos/octocat/Hello-World/releases/1197692/assets{?name}' --token "$GITHUB_TOKEN" ./dist/foo.zip ./dist/bar.txt
```

Run it without installing using `npx`:

```shell
npx gh-release-assets --url <upload_url> ./foo.zip
```

Uploaded filenames are printed to stdout; progress is written to stderr. The command exits non-zero on error, or when `--url`, an asset, or a token is missing. Use `-h` / `--help` for usage.

## Contributing

Contributions welcome! Please read the [contributing guidelines](CONTRIBUTING.md) before opening an issue or making a pull request.

## License

[ISC](LICENSE.md)

Logo is the paperclip emoji, rendered locally from the system Apple Color Emoji font.
