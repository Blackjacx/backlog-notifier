const core = require('@actions/core');
const github = require('@actions/github');
const parseChangelog = require('changelog-parser');

async function getIssue(owner, repo, id) {
    const octokit = new github.GitHub(`${process.env.GITHUB_TOKEN}`);

    const { data: issue } = await octokit.issues.get({
        owner: `${owner}`,
        repo: `${repo}`,
        issue_number: `${id}`
    });
    return issue
}

async function createComment(owner, repo, id, message) {
    const octokit = new github.GitHub(`${process.env.GITHUB_TOKEN}`);

    console.log(`Create comment in repo ${owner}/${repo} for issue number #${id}`)

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

  const backlogRepo = core.getInput('backlog-repo-name');
  const backlogTicketPrefix = core.getInput('backlog-ticket-prefix');
  const message = core.getInput('message').replace('#', `[${tag}](${tagUrl})`);

  console.log(`tag: ${tag}`);
  console.log(`tagUrl: ${tagUrl}`);
  console.log(`owner: ${owner}`);
  console.log(`backlogRepo: ${backlogRepo}`);
  console.log(`backlogTicketPrefix: ${backlogTicketPrefix}`);
  console.log(`message: ${message}`);
  console.log(`The event payload: ${JSON.stringify(payload, undefined, 2)})`);

  if (!`${payload.ref}`.startsWith('refs/tags/'))
    throw Error(`The trigger for this action was not a tag reference!`);

  const changelog = await parseChangelog('CHANGELOG.md')
  console.log(changelog);

  const filteredChangelog = changelog.versions.filter(function(obj) {
      return obj.version === `${tag}`;
  });  
  console.log(filteredChangelog[0].body);

  prIds = filteredChangelog[0].body.replace(/\* \[#/gi, '').replace(/\]\(https.*/gi, '').split('\n');
  uniquePrIds = Array.from(new Set(prIds));
  console.log(uniquePrIds);

  for (const id of uniquePrIds) {
    const pr = await getIssue(owner, repo, id);
    console.log(pr);
    
    let re = new RegExp(`${backlogTicketPrefix}-[0-9]+`, 'g');
    let match = pr.body.match(re);

    if (match == null) {
      console.log(`Backlog reference not found on PR ${pr.html_url}. Specify it using the pattern "${backlogTicketPrefix}-<number>"`);
      continue;
    } else {
      backlogId = match[0].match(/[0-9]+/g)[0];
      console.log(`Backlog ID: ${backlogId}`);
    }
    
    const comment = await createComment(owner, backlogRepo, backlogId, message);
    console.log(`Comment created\n${comment}`);
  }  
}

try {
  run().then(function (result) {
    console.log('Done 🎉')
  }).catch(function (err) {
    // Whoops, something went wrong!
    console.error(err);
  })  
} catch (error) {
  core.setFailed(error.message)
}