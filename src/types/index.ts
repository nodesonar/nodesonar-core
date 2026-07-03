export namespace PingHost {
    export interface Response {
        host: string;
        responseMs: number | unknown;
        status: 'Online' | 'Offline';
        isReachable: boolean;
        output: string;
        packetLoss: number;
    };

    export interface Options {
        count?: number;
        timeout?: number;
        packetSize?: number;
        extra?: string[];
    };

    export interface PollHostConfig {
        host: string;
        interval?: number;
    }
};

export namespace IPScan {
    export interface Options {
        timeout?: number;
    }

    export type Discovered = Pick<PingHost.Response, 'host' | 'responseMs'>;
}
