const core = require('@actions/core');
const github = require('@actions/github');
const parseChangelog = require('changelog-parser');

async function getIssue(owner, repo, id) {
  const octokit = github.getOctokit(`${process.env.GITHUB_TOKEN}`)

  const { data: issue } = await octokit.issues.get({
    owner: `${owner}`,
    repo: `${repo}`,
    issue_number: `${id}`
  });
  return issue
}

async function createComment(owner, repo, id, message) {  
  const octokit = github.getOctokit(`${process.env.GITHUB_TOKEN}`)

  console.log(`➡️ Creating comment for issue ${owner}/${repo}/issues/${id}`)

  const { data: comment } = await octokit.issues.createComment({
    owner: `${owner}`,
    repo: `${repo}`,
    issue_number: `${id}`,
    body: `${message}`
  });
  return comment
}

async function run() {
    // Get the JSON webhook payload for the event that triggered the workflow
    const payload = github.context.payload;

    const tag = `${payload.ref}`.split('/').pop();
    const tagUrl = `${payload.repository.html_url}/releases/tag/${tag}`;
    const owner = `${payload.repository.owner.login}`;
    const repo = `${payload.repository.name}`;

    const referenceRepoNames = Array.from(new Set(core.getInput('reference-repo-names').split(',').map(string => string.trim())))
    const referenceRepoPrefixes = Array.from(new Set(core.getInput('reference-repo-prefixes').split(',').map(string => string.trim())))
    const message = core.getInput('message').replace('#', `[${tag}](${tagUrl})`);
    const changelogPath = core.getInput('changelog-path');

    console.log(`➡️ tag: ${tag}`);
    console.log(`➡️ tagUrl: ${tagUrl}`);
    console.log(`➡️ owner: ${owner}`);
    console.log(`➡️ referenceRepoNames: ${referenceRepoNames} (${referenceRepoNames.length})`);
    console.log(`➡️ referenceRepoPrefixes: ${referenceRepoPrefixes} (${referenceRepoPrefixes.length})`);
    console.log(`➡️ message: ${message}`);
    console.log(`➡️ The event payload: ${JSON.stringify(payload, undefined, 2)})`);

    if (referenceRepoNames.length != referenceRepoPrefixes.length)
      throw Error('🔴 Different count in arrays "reference-repo-names" and "reference-repo-prefixes" Please specify same length. Repo names and repo prefixed must match.');

    if (!`${payload.ref}`.startsWith('refs/tags/'))
      throw Error('🔴 The trigger for this action was not a tag reference!');

    const changelog = await parseChangelog(changelogPath)
    console.log('➡️ Changelog:\n%O', changelog);

    const filteredChangelog = changelog.versions.filter(function(obj) {
      return obj.version === `${tag}`;
    });  
    console.log(`➡️ Filtered Changelog:\n${filteredChangelog[0].body}`);

    prIds = filteredChangelog[0].body.replace(/\* \[#/gi, '').replace(/\]\(https.*/gi, '').split('\n');
    uniquePrIds = Array.from(new Set(prIds))
    console.log('➡️ Unique PR IDs:\n%O', uniquePrIds)

    for (const id of uniquePrIds) {
      const pr = await getIssue(owner, repo, id)
      console.log('➡️ Pull Request:\n%O', pr)

      for (const [i, prefix] of referenceRepoPrefixes.entries()) {
        const repoName = referenceRepoNames[i]

        let expression = new RegExp(`${prefix}-[0-9]+`, 'g')
        let matches = pr.body.match(expression)

        if (matches == null) {
          console.log(`🟡 No issue references found for "${prefix}" on PR "${pr.html_url}". Please specify them using the pattern "${prefix}-<number>"`)
          continue
        }

        for (const match of matches) {
          issueReferenceID = match.match(/[0-9]+/g)[0]
          console.log(`🟢 Issue reference found: ${match}`)

          const comment = await createComment(owner, repoName, issueReferenceID, message)
          console.log('🟢 Comment created:\n%O', comment)
        }
      }
    }
  }

  try {
    run().then(function (result) {
      console.log('🟢  Done 🎉')
    }).catch(function (err) {
    // Whoops, something went wrong!
    console.error(`🔴 ${err}`);
  })  
  } catch (error) {
    core.setFailed(error.message)
  }