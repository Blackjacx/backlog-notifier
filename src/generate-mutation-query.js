/**
 * Update a P2 field value
 *
 * @param {object} data - The graphQL data
 * @param {string} updatingField - The field that should be updated.
 * @param {string} newFieldValue - The new field value.
 * @param {string} url - Issue or Pull request url
 */
const mutation = (data, updatingField, newFieldValue, url) => {
    console.log(`🟢 ${JSON.stringify(data)}`)

    const projectItems = data.projectItems.nodes || []
    const project = data.projectV2
    const field = project.field
    const newFieldValues = (field.options || []).filter(
        fieldValue => fieldValue.name === newFieldValue
    )

    if (data == null) {
        throw new Error(`🔴 No resource could be found for issue "${url}"`)
    }

    if (projectItems.length === 0) {
        throw new Error(
            `🔴 Could not find any project items (cards) for issue "${url}"`
        )
    }

    if (project == null) {
        throw new Error(`🔴 Could not find the project for issue "${url}"`)
    }

    if (field == null) {
        throw new Error(
            `🔴 Field "${updatingField}" could not be found on project "${project.title}"`
        )
    }

    if (newFieldValues.length === 0) {
        throw new Error(
            `🔴 No field values with name "${newFieldValue}" found on board "${project.title}"`
        )
    }

    return `mutation {
                updateProjectV2ItemFieldValue( input: {
                    projectId: "${project.id}", # project id (Backlog)
                    itemId: "${projectItems[0].id}", # project item id (card)
                    fieldId: "${field.id}", # board field id (Status)
                    value: { 
                        singleSelectOptionId: "${newFieldValues[0].id}" # new field value id (Done)
                    }
                }) {clientMutationId}
            }`
}

module.exports = mutation
