/**
 * Unit tests for the action's entrypoint, src/index.js
 */

describe('index', () => {
    it('verified that 1+1=2', async () => {
        expect(1 + 1).toBe(2)
    })
})

jest.mock('@actions/core')
jest.mock('@actions/github')
jest.mock('changelog-parser')
jest.mock('../src/generate-project-query')
jest.mock('../src/generate-mutation-query')

const core = require('@actions/core')
const github = require('@actions/github')
const parseChangelog = require('changelog-parser')
const { run } = require('../src/index')

describe('GitHub Action main runner', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    core.getInput.mockImplementation((name) => {
      if (name === 'action') return 'notify'
      if (name === 'repo-references') return JSON.stringify({ data: [{ repo_id: 'abc', repo_name: 'sample-repo' }] })
      if (name === 'changelog-path') return 'CHANGELOG.md'
      if (name === 'message') return 'Release #'
      return ''
    })

    github.context = {
      eventName: 'push',
      payload: {
        ref: 'refs/tags/1.0.0',
        repository: {
          name: 'test-repo',
          owner: { login: 'test-owner' },
          html_url: 'https://github.com/test-owner/test-repo'
        }
      }
    }

    process.env.GITHUB_TOKEN = 'dummy-token'

    const octokit = {
      rest: {
        issues: {
          get: jest.fn().mockResolvedValue({ data: { html_url: 'https://github.com/test-owner/test-repo/issues/1', node_id: 'MDU6SXNzdWUx', body: 'Issue body' } }),
          createComment: jest.fn().mockResolvedValue({ data: { id: 1 } })
        }
      },
      graphql: jest.fn().mockResolvedValue({ resource: {} })
    }

    github.getOctokit.mockReturnValue(octokit)

    parseChangelog.mockResolvedValue({
      versions: [
        {
          version: '1.0.0',
          body: '* [#123](https://github.com/test-owner/test-repo/pull/123)'
        }
      ]
    })
  })

  it('runs notify action without throwing', async () => {
    await expect(run()).resolves.not.toThrow()
    expect(core.notice).toHaveBeenCalledWith(expect.stringContaining('Success'))
  })

  it('fails gracefully when changelog has no versions', async () => {
    parseChangelog.mockResolvedValue({ versions: [] })
    await run()
    expect(core.setFailed).toHaveBeenCalledWith(expect.stringContaining('does not contain any versions'))
  })
})
