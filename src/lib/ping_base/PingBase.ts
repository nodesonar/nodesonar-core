import ping from 'ping';

import { formatPingResponse } from '../../utils/pingUtils';

import type { PingHost } from '../../types';

export abstract class PingBase {
    protected readonly options: PingHost.Options;
    constructor(options?: PingHost.Options) {
        this.options = options ?? {
            count: 1,
            timeout: 10,
            packetSize: 32,
        };
    }

    protected async ping(host: string): Promise<PingHost.Response> {
        const response = await ping.promise.probe(host, {
            timeout: this.options.timeout,
            extra: this.options.extra,
            packetSize: this.options.packetSize,
            min_reply: this.options.count,
        });

        return formatPingResponse({ ...response, count: this.options.count as number });
    }
};
