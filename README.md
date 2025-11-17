[![Twitter Follow](https://img.shields.io/badge/follow-%40blackjacx-1DA1F2?logo=twitter&style=for-the-badge)](https://twitter.com/intent/follow?original_referer=https%3A%2F%2Fgithub.com%2Fblackjacx&screen_name=Blackjacxxx)
[![Donate](https://img.shields.io/badge/Donate-PayPal-blue.svg?logo=paypal&style=for-the-badge)](https://www.paypal.me/STHEROLD)

# Backlog Notifier GitHub Action (JS)

## Description

The action has two functionalities which are described below.

### Notify

Automatic notification of ticket owners (product owner, product managers, people watching tickets, ...) released features. It takes away the need of asking around or manual commenting on tickets regarding released features. Usually this is triggered at release time.

In our company we have separate repos for iOS, Android and web. Additionally, we have separate repos to handle backlog, bug tickets and more. Each bug or backlog ticket is referenced in the platform-specific repo's PR that solved the ticket. This action is able to detect these references and automatically comment on the master ticket, e.g. when a tag is created. It can also put the released version into the comment. This automatically informs all stakeholders in which version the feature gets released or the bug gets resolved. For us this is a huge time saver. 

Of course this can also be used if you have a simpler setup than the one described above. If you develop e.g. your own iOS app, wouldn't it be practical to automatically post a comment on each issue/PR with the released app version the issue/PR made it in? Yes you can do that too :)

For PRs that resolve multiple issues this action is also capable of detecting each reference and comment on all of the connected tickets.

The only thing this action relies on is that you maintain a CHANGELOG.md file following the format described on [Keep A Changelog](https://keepachangelog.com/). This good practice anyways, so win-win!

### Field Update

Updating any single-select field of a ticket, referenced in a PR, on a version 2 project board when this PR is merged. This is useful to move tickets to the Done lane when a PR is merged. 

The core of the action detects tickets **referenced in a PR** that are from different repos. That can be tickets from a separate backlog or bug repo. They are not owned by the development team and can therefore not be closed by them. Also these tickets are usually created by somebody else that is interested in a bug getting fixed or a feature getting implemented. Posting a comment at release time automatically notifies the ticket owners about the release.

## Inputs

| Input           | Required | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| --------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| repo-references | ✅       | Unique, human readable (1) identifiers and (2) repository names in JSON format. (1) are used as prefixes for issue numbers in PR description bodies. (2) The names of the linked repositories. Both are specified as list of associated arrays. You can specify as many ID/repo combinations as you want. The identifiers should be single words, like BACKLOG or BUGLOG which e.g. could identify repos for backlog and bug tickets. The ID, as the action searches it in the PR description, should be the prefix of the issue number. Prefix and the issue number must be separated by a dash, e.g. `BACKLOG-539`. |
| action          | ❌       | The message that is posted in the backlog ticket. Use `#` as placeholder for the version number.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| message         | ❌       | The path to the CHANGELOG.md file. Defaults to CHANGELOG.md                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| changelog-path  | ❌       | The action performed by this GitHub Action. Possible values are `notify` and `move`. Notify is the default and creates comments on tickets. Move can move an issue to a new lane on a GitHub Issues board.                                                                                                                                                                                                                                                                                                                                                                                                            |
| project-number  | ❌       | The number of the project where the issue should be moved.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| updating-field  | ❌       | The name of the field that should be updated. It is not restricted to Status. You can update any "single selection field", e.g. the custom field "Priority".                                                                                                                                                                                                                                                                                                                                                                                                                                                          | 
| new-field-value | ❌       | The value the respecting field should be updated to.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| gh-token        | ❌       | The GitHub token used to authenticate with the GitHub API. Defaults to ${{ secrets.GITHUB_TOKEN }}.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |

## Example Usage

You can find example usages in the repo GHTest which I use to test this GH action.

An example workflow for the `Notify` action can be found [here](https://github.com/Blackjacx/ghtest/blob/develop/.github/workflows/backlog-notifier.yml).

An example workflow for the `Field Update` action can be found [here](https://github.com/Blackjacx/ghtest/blob/develop/.github/workflows/move-referenced-issue-on-pr-merge.yml).

## Tests

I didn't find a way to properly test the JS action implementation in `index.js` locally yet. That's why I created the repos [Backlog](https://github.com/Blackjacx/backlog) and [GHTest](https://github.com/Blackjacx/ghtest). 

Backlog is just setup with some issues where the action can comment on and which can be referenced from PRs in different repos.

GHTest contains a [shell script](https://github.com/Blackjacx/ghtest/blob/develop/trigger-backlog-notifier.sh) that can trigger this action. It will essentially push a tag to GitHub, i.e. create a release which is the main use case where this action should run. After executing the script this [GHTest workflow](https://github.com/Blackjacx/ghtest/blob/develop/.github/workflows/backlog-notifier.yml) is used to run the action on GitHub. It is configured to detect ticket references for both repos, `Backlog` and `GHTest`.

After you made any change to `index.js` you have to run `npm run all` to re-create the whole package including linting, testing and packaging. A shortcut for build, commit, push is ` npm run all && gc -a --amend --no-edit && gpf`.

## Release

To release the backlog notifier do the following:
- In `CHANGELOG.md` tag the release and move all PRs from unreleased to the new tag you'll create
- Update version in `package.json`
- Update all dependencies in `package.json` by running `npm-upgrade` (install: `npm i -g npm-upgrade`)
- Package the application using `npm run all`
- Commit using the message `Release version <tag>`
- On GitHub [draft a new release](https://github.com/Blackjacx/backlog-notifier/releases/new) and specify to create the new tag

## Kudos

This project has been heavily inspired by:
- https://github.com/actions/javascript-action/tree/main
- https://github.com/alex-page/github-project-automation-plus

Thank you all ❤️

## License

This software is available under the MIT license. See [LICENSE](LICENSE) for details.
