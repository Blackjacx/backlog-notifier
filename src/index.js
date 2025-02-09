// [TODO] Owner should be always connected with the repo name. Currently we have support for only one owner! Create Repository object which contains the params `name` and `owner`

const core = require('@actions/core')
const github = require('@actions/github')
const parseChangelog = require('changelog-parser')

const generateProjectQuery = require('./generate-project-query')
const generateMutationQuery = require('./generate-mutation-query')

// Print satck trace on warning/error
process.on('warning', warning => {
    console.log(warning.stack)
})

async function run() {
    try {
        const token = core.getInput('gh-token')
        const octokit = github.getOctokit(token)

        // Get the JSON webhook context for the event that triggered the workflow
        const context = github.context
        const owner = `${context.payload.repository.owner.login}`

        // Parsing Inputs

        const action = core.getInput('action')
        // Parse JSON inputs and trim string values
        const repoReferences = JSON.parse(
            core.getInput('repo-references'),
            (key, value) => {
                return typeof value === 'string' ? value.trim() : value
            }
        )

        core.startGroup(`🟢 Common Action Details`)
        console.log(`🟢 Action: ${action}`)
        console.log(`🟢 Owner: ${owner}`)
        console.log(
            `🟢 Repo References: ${JSON.stringify(repoReferences, null, '\t')}`
        )
        console.log(`🟢 Event Context: ${JSON.stringify(context)}`)
        core.endGroup()

        switch (action) {
            case 'notify':
                await runActionNotify(context, owner, repoReferences, octokit)
                break
            case 'move':
                await runActionMove(context, owner, repoReferences, octokit)
                break
            default:
                throw Error(`🔴 Unknown action "${action}"`)
        }

        core.notice(`🟢 Success 🎉`)
    } catch (error) {
        core.setFailed(error.message)
    }
}

// Intended to run when a tag is created and the action `notify` is specified
async function runActionNotify(context, owner, repoReferences, octokit) {
    // Processing Inputs

    const payload = context.payload
    // Tag is provided in format: `ref: "refs/tags/0.0.1"``
    const tag = `${payload.ref}`.split('/').pop()
    const tagUrl = `${payload.repository.html_url}/releases/tag/${tag}`
    const repo = `${payload.repository.name}`

    const changelogPath = core.getInput('changelog-path')
    const message = core.getInput('message').replace('#', `[${tag}](${tagUrl})`)

    // Logging Inputs

    console.log(`🟢 Tag: ${tag}`)
    console.log(`🟢 TagUrl: ${tagUrl}`)
    console.log(`🟢 Repo: ${repo}`)
    console.log(`🟢 Message: ${message}`)
    console.log(`🟢 Changelog Path: ${changelogPath}`)

    if (!`${payload.ref}`.startsWith('refs/tags/'))
        throw Error('🔴 The trigger for this action was not a tag reference!')

    // Parse the changelog file to JSON format

    const changelog = await parseChangelog(changelogPath)
    console.log(`🟢 Changelog: \n${JSON.stringify(changelog, null, '\t')}`)

    if (changelog.versions.length === 0)
        throw Error('🔴 The changelog does not contain any versions')

    // Filter changelog section for given `tag`

    const taggedChangelogSection = changelog.versions.filter(function (obj) {
        return obj.version === `${tag}`
    })

    if (taggedChangelogSection.length === 0) {
        throw Error(
            `🔴 The tag "${tag}" was not found among the sections of the changelog file.`
        )
    }
    console.log(
        `🟢 Tagged Changelog Section: \n${taggedChangelogSection[0].body}`
    )

    // Extract the ID of each pull requst in the changelog section

    // Saved regex: https://regex101.com/r/7kjABI/1
    const prIds = taggedChangelogSection[0].body
        .match(/^\* \[#[0-9]*\].*/gim)
        .map(line => line.replace(/\* \[#/gi, '').replace(/\]\(https.*/gi, ''))

    const uniquePrIds = Array.from(new Set(prIds))
    console.log(`🟢 Unique pull reuqest IDs: ${uniquePrIds}`)

    // Parse the PR body and search for issue references

    async function onMatch(repoName, referencedIssueId) {
        // Create a comment about the release in (notify) each matching issue
        const comment = await createComment(
            owner,
            repoName,
            referencedIssueId,
            message,
            octokit
        )
    }

    for (const id of uniquePrIds) {
        const pr = await getIssue(owner, repo, id, octokit)
        await parsePrBodyForMatchingIssues(pr, repoReferences, onMatch)
    }
}

// Intended to run when a PR is merged and the action `move` is specified
async function runActionMove(context, owner, repoReferences, octokit) {
    // Processing Inputs

    const projectNumber = core.getInput('project-number')
    const updatingField = core.getInput('updating-field')
    const newFieldValue = core.getInput('new-field-value')

    const eventName = context.eventName
    const action = context.payload.action
    const pr = context.payload.pull_request

    // Logging Inputs

    console.log(`🟢 Project Number: ${projectNumber}`)
    console.log(`🟢 Updating Field: ${updatingField}`)
    console.log(`🟢 New Field Value: ${newFieldValue}`)
    console.log(`🟢 Event Action: ${action}`)

    if (action !== 'closed') {
        console.log(
            `🟡 This action only supports the event-trigger action "closed". Got "${action}"`
        )
        return
    }

    if (eventName !== 'pull_request') {
        throw Error(
            `🔴 This action only supports the event-trigger "pull_request". Got "${eventName}"`
        )
    }

    if (pr == null) {
        throw Error(`🔴 The payload doesn't seem to be a PR.`)
    }

    // Parse the PR body and search for issue references

    async function onMatch(repoName, referencedIssueId) {
        // Get issue object for the issue ID

        const referencedIssue = await getIssue(
            owner,
            repoName,
            referencedIssueId,
            octokit
        )
        const htmlUrl = referencedIssue.html_url
        const nodeId = referencedIssue.node_id

        console.log(`🟢 HTML Url: ${htmlUrl}`)
        console.log(`🟢 Node ID: ${nodeId}`)

        if (htmlUrl == null) throw Error(`🔴 The 'html_url' not found`)

        if (nodeId == null) throw Error(`🔴 The 'node_id' not found`)

        // Get project, project items and field information.

        // We only reference issues here ("issue").
        const projectQuery = generateProjectQuery(
            htmlUrl,
            'issue',
            updatingField,
            newFieldValue,
            projectNumber
        )
        logGrouped('🟢 Project Query', `${projectQuery}`)

        const { resource } = await octokit.graphql(projectQuery)
        console.log(`🟢 Result: ${JSON.stringify(resource)}`)

        // Generate the mutation query

        const mutationQuery = generateMutationQuery(
            resource,
            updatingField,
            newFieldValue,
            htmlUrl
        )
        logGrouped('🟢 Mutation Query', `${mutationQuery}`)

        await octokit.graphql(mutationQuery)
    }

    await parsePrBodyForMatchingIssues(pr, repoReferences, onMatch)
}

// Helper function that finds referenced issues for exactly one PR object
async function parsePrBodyForMatchingIssues(pr, repoReferences, onMatch) {
    for (const reference of repoReferences.data) {
        const repoID = reference.repo_id
        const repoName = reference.repo_name

        const expression = new RegExp(`${repoID}-[0-9]+`, 'g')
        const matchingIssues = pr.body.match(expression)

        if (matchingIssues == null) {
            console.log(
                `🟡 No issue references found for "${repoID}" on PR "${pr.html_url}". Please specify them using the pattern "${repoID}-<number>"`
            )
            continue
        }

        for (const match of matchingIssues) {
            const issueReferenceID = match.match(/[0-9]+/g)[0]
            console.log(
                `🟢 Issue ID found: '${issueReferenceID}' for repo '${repoName}'`
            )

            await onMatch(repoName, issueReferenceID)
        }
    }
}

async function getIssue(owner, repo, issue_number, octokit) {
    console.log(`🟢 Fetching issue with ID: ${issue_number}`)

    const { data: issueData } = await octokit.rest.issues.get({
        owner,
        repo,
        issue_number
    })

    console.log(`🟢 Issue:\n${JSON.stringify(issueData)}`)

    return issueData
}

async function createComment(owner, repo, issue_number, body, octokit) {
    console.log(
        `🟢 Creating comment for issue ${owner}/${repo}/issues/${issue_number}`
    )

    const { data: commentData } = await octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number,
        body
    })

    console.log(`🟢 Comment created:\n${JSON.stringify(commentData)}`)

    return commentData
}

function logGrouped(title, message) {
    core.startGroup(title)
    console.log(message)
    core.endGroup()
}

run()
