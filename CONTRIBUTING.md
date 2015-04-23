# Contributing

> Contributions Welcome!

# Install

Fork & clone the repo, then `npm install` to install all dependencies.

# Testing

Tests are run with `npm test`. This checks the code style with [standard](https://github.com/feross/standard) and then runs the [tape](https://github.com/substack/tape) tests.

Because the tests access a GitHub repository and upload assets, you need to set three environmental variables or the tests will fail. `TOKEN` is a GitHub user token. `RELEASE` is an id of a GitHub release. `REPO` is a repo that **has releases** and that **you have access to**. The tests actually upload assets, so best to have it be a release you don't really care about (test, temporary, etc...).

Set the environmental variables *before* you run `npm test` like this:

```
TOKEN=your-sweet-github-token RELEASE=7565465 REPO=octocat/hello-world npm test
```
