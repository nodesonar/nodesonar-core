import { NodeSonarError } from '../error_base/NodeSonarError';
import { PingBase } from '../ping_base/PingBase';

import type { PingHost } from '../../types';

interface PollState {
    timer: NodeJS.Timeout | undefined;
    stopped: boolean;
}

export class Poller extends PingBase {
    private polls = new Map<string, PollState>();

    constructor(options?: PingHost.Options) {
        super(options);
    }

    /**
     * Returns the current poller configuration.
     */
    get config(): PingHost.Options {
        return this.options;
    }

    /**
     * Begins polling a host. The next ping is scheduled only after the previous one
     * has finished, so runs for the same host never overlap. `interval` is the gap
     * between the end of one ping and the start of the next.
     * If the host is already being polled, the existing poll is stopped first.
     * @param config - Poll configuration containing the host and optional interval in ms (default: 1000ms).
     * @param cb - Callback invoked with the ping result after each run.
     * @param onError - Optional callback invoked if a ping (or `cb`) throws. Polling continues afterwards.
     */
    pollHost(
        config: PingHost.PollHostConfig,
        cb: (res: PingHost.Response) => void | Promise<void>,
        onError?: (error: unknown, host: string) => void,
    ): void {
        const { host } = config;
        const interval = config.interval ?? 1000;

        if (!Number.isFinite(interval) || interval < 1000) {
            throw new NodeSonarError('config.interval must be at least 1000ms (1 second)');
        }

        if (this.polls.has(host)) {
            this.stopPolling(host);
        }

        const state: PollState = { timer: undefined, stopped: false };

        this.polls.set(host, state);

        const tick = async (): Promise<void> => {
            try {
                const res = await this.ping(host);

                if (!state.stopped) await cb(res);
            } catch (error) {
                if (!state.stopped) onError?.(error, host);
            } finally {
                if (!state.stopped) {
                    state.timer = setTimeout(() => void tick(), interval);
                }
            }
        };

        state.timer = setTimeout(() => void tick(), interval);
    }

    /**
     * Stops polling a specific host and clears its pending timer.
     * @param host - The IP address or hostname to stop polling.
     * @throws NodeSonarError if the host is not currently being polled.
     */
    stopPolling(host: string): void {
        const state = this.polls.get(host);

        if (!state) {
            throw new NodeSonarError(`Host '${host}' is not currently being polled`);
        }

        state.stopped = true;
        clearTimeout(state.timer);
        this.polls.delete(host);
    }

    /**
     * Stops all active polling and clears the internal host map.
     */
    stopAll(): void {
        for (const state of this.polls.values()) {
            state.stopped = true;
            clearTimeout(state.timer);
        }

        this.polls.clear();
    }

    /**
     * Returns a list of hosts currently being polled.
     */
    get activeHosts(): string[] {
        return [...this.polls.keys()];
    }

    /**
     * Pings a host once and returns the result.
     * @param host - The IP address or hostname to ping.
     * @returns A promise resolving to the ping result.
     */
    public async pingHost(host: string): Promise<PingHost.Response> {
        return await this.ping(host);
    }
}
