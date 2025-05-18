class Repository {
    constructor(name, owner) {
        if (!name || !owner) {
            throw new Error('Repository must have both name and owner')
        }
        this.name = name
        this.owner = owner
    }

    toString() {
        return `${this.owner}/${this.name}`
    }
}

module.exports = Repository
