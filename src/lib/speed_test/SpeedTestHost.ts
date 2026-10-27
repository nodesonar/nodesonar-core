
export abstract class SpeedTestHost {
    private readonly host: string;

    constructor() {
        this.host = 'https://speed.cloudflare.com';
    }

    protected async executeDownloadSpeed(bytes = 0): Promise<Response> {
        return await this.executeRequest(`/__down?bytes=${bytes}`);
    }

    protected async executeUploadSpeed(payload: Buffer<ArrayBuffer>): Promise<Response> {
        return this.executeRequest('__up', { method: 'POST', body: payload });
    }

    private async executeRequest(path: string, init?: RequestInit): Promise<Response> {
        return await fetch(`${this.host}/${path}`, init);
    }
};
