import type { PingResponse } from 'ping/types/parser/base';

export namespace PingHost {
    export interface PingResponseBase extends Omit<PingResponse, 'packetLoss'> {
        count: number;
        packetLoss: string;
    }

    export interface Response {
        host: string;
        latency: {
            average: number;
            fastest: number;
            slowest: number;
        } | null,
        count: number;
        status: 'Online' | 'Offline';
        isReachable: boolean;
        output: string;
        packetLoss: number;
        packetsReceived: number;
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

    export type Discovered = Pick<PingHost.Response, 'host' | 'latency'>;
}
