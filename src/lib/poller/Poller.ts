import { PingBase } from '../ping_base/PingBase';

import type { PingHost } from '../../types';

export class Poller extends PingBase {
    private intervals = new Map<string, NodeJS.Timeout>();

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
     * Begins polling a host at a specified interval, invoking the callback with each ping result.
     * If the host is already being polled, the existing interval is cleared before starting a new one.
     * @param config - Poll configuration containing the host and optional interval in ms (default: 1000ms).
     * @param cb - Callback invoked with the ping result on each interval.
     */
    pollHost(config: PingHost.PollHostConfig, cb: (res: PingHost.Response) => void): void {
        const { host } = config;
        const interval = config?.interval ?? 1000;

        this.stopPolling(host);
        const id = setInterval(async () => {
            const res = await this.ping(host);

            cb(res);
        }, interval);

        this.intervals.set(host, id);
    }

    /**
     * Stops polling a specific host and clears its interval.
     * @param host - The IP address or hostname to stop polling.
     */
    stopPolling(host: string): void {
        const id = this.intervals.get(host);

        if (id) {
            clearInterval(id);
            this.intervals.delete(host);
        }
    }

    /**
     * Stops all active polling intervals and clears the internal host map.
     */
    stopAll(): void {
        this.intervals.forEach((id) => clearInterval(id));
        this.intervals.clear();
    }

    /**
     * Returns a list of hosts currently being polled.
     */
    get activeHosts(): string[] {
        return [...this.intervals.keys()];
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
