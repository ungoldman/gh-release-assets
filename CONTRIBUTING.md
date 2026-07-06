# Contributing

> Contributions Welcome!

# Install

Fork & clone the repo, then `npm install` to install all dependencies.

# Testing

Run `npm test`. This lints with [Biome](https://biomejs.dev/), type-checks and builds with [TypeScript](https://www.typescriptlang.org/), and runs the [`node:test`](https://nodejs.org/api/test.html) suite. The tests run against a local HTTP server fixture, so no GitHub token or network access is required.

Run `npm run coverage` to check coverage (held at 100%), and `npm run format` to apply lint and formatting fixes.

# Coding Guidelines

- Commits should be atomic and adhere to [conventional commit](https://conventionalcommits.org) standards.
- Commit messages should be short (`<topic>: <action>`, 50 char max), and commit bodies only included when necessary for complex changes (72 char max).
- Breaking changes are discouraged, and require a `BREAKING CHANGE:` footer in the commit body explaining the change.
- Types and interfaces should be inlined unless they're absolutely necessary for exporting or testing.
- Avoid unnecessary code comments, and keep necessary ones trim.
- All changes should maintain the test coverage gate (100%).
