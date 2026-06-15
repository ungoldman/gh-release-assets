# Contributing

> Contributions Welcome!

# Install

Fork & clone the repo, then `npm install` to install all dependencies.

# Testing

Run `npm test`. This lints with [Biome](https://biomejs.dev/), type-checks and builds with [TypeScript](https://www.typescriptlang.org/), and runs the [`node:test`](https://nodejs.org/api/test.html) suite. The tests run against a local HTTP server fixture, so no GitHub token or network access is required.

Run `npm run coverage` to check coverage (held at 100%), and `npm run format` to apply lint and formatting fixes.
