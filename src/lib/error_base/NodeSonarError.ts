export class NodeSonarError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'NodeSonarError';
    }
};
