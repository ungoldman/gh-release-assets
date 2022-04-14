# gh-release-assets change log

All notable changes to this project will be documented in this file.
This project adheres to [Semantic Versioning](http://semver.org/).

## [2.0.1](https://github.com/ungoldman/gh-release-assets/releases/v2.0.1)

### Fixes
- fix: explicitly set minimum node version in `engines` field of `package.json` (https://github.com/ungoldman/gh-release-assets/pull/17)

### Misc
- deps: mime@3.0.0 (#13)
- Ownership change! Repo is now at https://github.com/ungoldman/gh-release-assets. Same maintenance team, reason for move is hypermodules org is being retired.

## [2.0.0](https://github.com/ungoldman/gh-release-assets/releases/v2.0.0)

- Replace depreciated `request` with `simple-get`.
- BREAKING CHANGE: Update all deps which raises the minimum node version to 12.

## [1.1.2](https://github.com/ungoldman/gh-release-assets/releases/v1.1.2)

- update `request` dependency

## [1.1.1](https://github.com/ungoldman/gh-release-assets/releases/v1.1.1)

- src: lint, fix tests, add no assets error message
- pkg, readme: update repo URL
- ci: bump node, update env vars
- pkg: add release script

## [1.1.0](https://github.com/ungoldman/gh-release-assets/releases/v1.1.0)

- Add ability to authorize with username/password

## [1.0.0](https://github.com/ungoldman/gh-release-assets/releases/v1.0.0)

- Uploads array of assets to a release
- Allows for renaming assets while uploading
- Emits start, progress, and finish events for all files
- Error handling for missing files
