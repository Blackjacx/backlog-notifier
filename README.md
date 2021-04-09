# Backlog Notifier GitHub Action (JS)

This action automatically notifies ticket owners (product owner, product managers, people watching tickets, ...) about included features when it gets triggered, e.g. at release time. It takes away the need of asking or manual commenting on tickets when they get resolved.

## How does it work? 

This action was born to get rid of manually inform all responsible people that a certain backlog ticket has been closed when the connected PR makes it into a release.

In our company we have separate repos for iOS, Android and web. Additionally, we have global repos to handle backlog and bug tickets respectively. For each bug or backlog ticket we create an issue in the platform-specific repo and reference the master-ticket. This action is able to detect these references and automatically comment on the master ticket, e.g. when a tag is created. It can also put the released version into the comment. This automatically informs all stakeholders in which version the feature gets released or the bug gets resolved. For us this is a huge time saver. 

Of course this can also be used if you have a simpler setup than the one described above. If you develop e.g. your own iOS app, wouldn't it be practical to automatically post a comment on each issue/PR with the released app version the issue/PR made it in? Yes you can do that too :)

For PRs that resolve multiple issues this action is also capable of detecting each reference and comment on all of the connected tickets.

The only thing this action relies on is that you maintain a CHANGELOG.md file following the format described on [Keep A Changelog](https://keepachangelog.com/). This good practice anyways, so win-win!

## Inputs

#### `reference-repo-prefixes` • required

Prefixes for issue numbers of reference repos. You can specify multiple comma-separated ones. The should be single words like BACKLOG or BUGLOG which could identify repos for backlog and bug tickets respectively. A complete identifier, as the action searches it in the PR description, should consist of this prefix and the issue number separated by a dash, e.g. `BACKLOG-539`. **Default:** `BACKLOG`.

#### `reference-repo-names` • required

Repository names that contain tickets to notify. This list must have the same number of elements as the repository prefixes list. Specify one repository name for each prefix. The repository must be located under the same GitHub account as the repository you use this action on. **Default:** `backlog`.

#### `message` • required

The message thats posted in the backlog ticket. Use `#` as placeholder for the version number. It will be automatically replaced. Default `"Dang! This feature has just been released in version # 🎉"`.

## Example Usage

The example below defines two prefixes and two repo names respectively, which enables the action to find connected tickets in the repos named `backlog` and `bug`. 

```
uses: blackjacx/backlog-notifier@master
with:
  reference-repo-prefixes: 'BACKLOG, BUG'
  reference-repo-names: 'backlog, bug'
  message: 'Dang! This feature is released in version # 🎉'
```

## Testing

I didn't find a way to properly test the JS action implementation in `index.js` locally yet. That's why I created the repos [Backlog](https://github.com/Blackjacx/backlog) and [GHTest](https://github.com/Blackjacx/ghtest). 

Backlog is just setup with some issues where the action can comment on and which can be referenced from PRs in different repos.

GHTest contains a [shell script](https://github.com/Blackjacx/ghtest/blob/develop/trigger-backlog-notifier.sh) that can trigger this action. It will essentially push a tag to GitHub, i.e. create a release which is the main use case where this action should run. After executing the script this [GHTest workflow](https://github.com/Blackjacx/ghtest/blob/develop/.github/workflows/backlog-notifier.yml) is used to run the action on GitHub. It is configured to detect ticket references for both repos, `Backlog` and `GHTest`.

## License

This software is available under the MIT license. See [LICENSE](LICENSE) for details.