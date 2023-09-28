/**
 * GraphQl query to get project, project items and field information
 *
 * @param {string} url - Issue or Pull request url
 * @param {string} eventName - The current event name
 * @param {string} updatingField - The field that should be updated.
 * @param {string} newFieldValue - The new field value.
 * @param {number} projectNumber - The number of the project the issue is in. Typically the number of the sprint board of the team working on the PR.
 */
const query = (url, eventName, updatingField, newFieldValue, projectNumber) =>
    `query {
        resource( url: "${url}" ) {
            ... on ${eventName.startsWith('issue') ? 'Issue' : 'PullRequest'} {
                id
                title 
                projectItems(first: 1) { 
                    nodes {
                        id
                    }
                }
                projectV2(number: ${projectNumber}) {
                    id
                    title
                    field(name: "${updatingField}") {
                        ... on ProjectV2SingleSelectField {
                            name
                            id
                            options {
                                id
                                name
                            }
                        }
                    }               
                }
            }
        }
    }`

module.exports = query
