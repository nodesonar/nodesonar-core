import type { PingResponse } from 'ping/types/parser/base';

export namespace PingHost {
    export interface PingResponseBase extends Omit<PingResponse, 'packetLoss'> {
        count: number;
        packetLoss: number | 'unknown';
    }

    interface ResponseBase {
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
        timestamp: string;
    };

    export interface ResponseOnline extends ResponseBase {
        isReachable: true,
        latency: {
            average: number;
            fastest: number;
            slowest: number;
        },
        status: 'Online';
    };

    export interface ResponseOffline extends ResponseBase {
        isReachable: false;
        latency: null;
        status: 'Offline';
    };

    export type Response = ResponseOnline | ResponseOffline;

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

    export type Discovered = Pick<PingHost.ResponseOnline, 'host'> & {
        latency: number;
    };

    export enum ScanStatus {
        STARTED = 'started',
        IN_PROGRESS = 'in_progress',
        COMPLETE = 'complete',
        FAILED = 'failed'
    };

    interface ResponseBase {
        discoveredCount: number;
        host: Discovered | null;
        status: ScanStatus;
        startTime: string;
        lastUpdated?: string;
        completedTime: string | null;
    }

    export interface DiscoverInProgress extends ResponseBase {
        completedTime: null;
        host: Discovered;
        status: ScanStatus.IN_PROGRESS;
    }

    export interface DiscoveComplete extends ResponseBase {
        completedTime: string;
        host: null;
        status: ScanStatus.COMPLETE;
    }

    export type Response = DiscoverInProgress | DiscoveComplete;
}

export namespace SpeedTestConfig {
    export namespace Measure {
        export interface Options {
            bytes?: number;
            streams?: number;
        }

        export type Response = number;

        export interface LatencyResponse {
            median: number;
            jitter: number;
        }
    }
}
