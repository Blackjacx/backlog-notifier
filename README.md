# Backlog Notifier Github Action (JS)

Comment on tickets connected to PRs in a teams platform specific repository in the same account about the release of a new PR / feature.

## Inputs

### `backlog-ticket-prefix`

**Required** Prefix of the backlog issue identifier. The whole identifier must look like `BACKLOG-539` and has to be part of the PR description. Default `"BACKLOG"`.

### `backlog-repo-name`

**Required** The repo name that contains your backlog tickets. Must be under the same github account as the repo you use this action in. Default `"backlog"`.

### `message`

**Required** The message thats posted in the backlog ticket. Use `#` as placeholder for the version number. It will be automatically replaced. Default `"This feature has just been released for iOS 🎉 Now it takes typically 2-3 days until the release is available in the App Store."`.

## Example usage

```
uses: blackjacx/backlog-notifier@master
with:
  backlog-ticket-prefix: 'BACKLOG'
  backlog-repo-name: 'backlog'
  message: 'Dang! This feature is released in version # 🎉'
```

## License

This software is available under the MIT license. See [LICENSE](LICENSE) for details.