import { Octokit } from "@octokit/rest";

const core = require('@actions/core');
const github = require('@actions/github');
const parseChangelog = require('changelog-parser');

async function getIssue(octokit: Oktokit, owner: string, repo: string, id: string) {
  if (!owner?.length) {
    throw new Error('Owner is required.');
  }

  if (!repo?.length) {
    throw new Error('Repository is required.');
  }

  if (!id?.toString().length) {
    throw new Error('Issue number is required.');
  }

  try {
    const { data: issue } = await octokit.issues.get({
      owner: owner,
      repo: repo,
      issue_number: id
    });
    return issue;
  } catch (error) {
    throw new Error(`Failed to get issue ${owner}/${repo}/issues/${id}: ${error.message}`);
  }
}

async function createComment(octokit: Oktokit, owner: string, repo: string, id: string, message: string) {  
  if (!owner?.length) {
    throw new Error('Owner is required.');
  }

  if (!repo?.length) {
    throw new Error('Repository is required.');
  }

  if (!id) {
    throw new Error('Issue number is required.');
  }

  console.log(`➡️ Creating comment for issue ${owner}/${repo}/issues/${id}`);

  try {
    const { data: comment } = await octokit.issues.createComment({
      owner: owner,
      repo: repo,
      issue_number: id,
      body: message
    });
    return comment;
  } catch (error) {
    throw new Error(`Failed to create comment for issue ${owner}/${repo}/issues/${id}: ${error.message}`);
  }
}

async function run(): Promise<void> {
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

  // Get the JSON webhook payload for the event that triggered the workflow
  const payload = github.context.payload;

  // Get tag information from the payload
  const tag = `${payload.ref}`.split('/').pop();
  const tagUrl = `${payload.repository.html_url}/releases/tag/${tag}`;
  
  // Get repository information from the payload
  const owner = `${payload.repository.owner.login}`;
  const repo = `${payload.repository.name}`;

  // Get input values from the action's configuration
  const referenceRepoNames = Array.from(new Set(core.getInput('reference-repo-names').split(',').map(string => string.trim())))
  const referenceRepoPrefixes = Array.from(new Set(core.getInput('reference-repo-prefixes').split(',').map(string => string.trim())))
  const message = core.getInput('message').replace('#', `[${tag}](${tagUrl})`);
  const changelogPath = core.getInput('changelog-path');

  console.log(`➡️ tag: ${tag}`);
  console.log(`➡️ tagUrl: ${tagUrl}`);
  console.log(`➡️ owner: ${owner}`);
  console.log(`➡️ referenceRepoNames: ${referenceRepoNames} (${referenceRepoNames.length})`);
  console.log(`➡️ referenceRepoPrefixes: ${referenceRepoPrefixes} (${referenceRepoPrefixes.length})`);
  console.log(`➡️ changelogPath: ${changelogPath}`);
  console.log(`➡️ message: ${message}`);
  console.log(`➡️ The event payload: ${JSON.stringify(payload, undefined, 2)})`);

  // Check that the input arrays have the same length
  if (referenceRepoNames.length !== referenceRepoPrefixes.length) {
    throw new Error(
      '🔴 Different count in arrays "reference-repo-names" and "reference-repo-prefixes". Please specify same length. Repo names and repo prefixes must match.',
    );
  }

  // Check that the trigger was a tag reference^
  if (!payload.ref.startsWith('refs/tags/')) {
    throw new Error('🔴 The trigger for this action was not a tag reference!');
  }

  // Parse the changelog and filter by the current tag
  const changelog = await parseChangelog(changelogPath);
  console.log(`➡️ Changelog:\n${changelog}`);

  const filteredChangelog = changelog.versions.filter((obj) => obj.version === tag);
  console.log(`➡️ Filtered Changelog:\n${filteredChangelog[0].body}`);

  // Extract the unique PR IDs from the changelog
  const prIds = filteredChangelog[0].body.replace(/\* \[#/gi, '').replace(/\]\(https.*/gi, '').split('\n');
  const uniquePrIds = Array.from(new Set(prIds));
  console.log(`➡️ Unique PR IDs:\n${uniquePrIds}`);

  // Iterate over the unique PR IDs and search for issue references in each one
  for (const id of uniquePrIds) {
    const pr = await getIssue(octokit, owner, repo, id);
    console.log(`➡️ Pull Request:\n${pr}`);

    const references = referenceRepoPrefixes.flatMap((prefix, i) => {
      const repoName = referenceRepoNames[i];
      const expression = new RegExp(`${prefix}-[0-9]+`, 'g');
      const matches = pr.body.match(expression) || [];
      return matches.map(match => ({ repoName, issueReferenceID: match.match(/[0-9]+/g)?.[0] }));
    });

    if (references.length === 0) {
      console.log(`🟡 No issue references found for PR "${pr.html_url}". Please specify them using the format "<prefix>-<number>"`);
      continue;
    }

    for (const { repoName, issueReferenceID } of references) {
      console.log(`🟢 Issue reference found: ${issueReferenceID}`);
      const comment = await createComment(octokit, owner, repoName, issueReferenceID, message);
      console.log(`🟢 Comment created:\n${comment}`);
    }
  }
}

try {
  await run();
  console.log('🟢 Done 🎉');
} catch (error) {
  if (error instanceof Error) {
    console.error(`🔴 ${error}`);
    core.setFailed(error.message)
  }
}