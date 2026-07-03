import type { PingHost } from '../types';

export const formatPingResponse = (pingResponse: PingHost.PingResponseBase): PingHost.Response => {
    return {
        host: pingResponse.host,
        latency: {
            average: pingResponse.time,
            slowest: Number(pingResponse.max),
            fastest: Number(pingResponse.min),
        },
        count: pingResponse.count,
        status: pingResponse.alive ? 'Online' : 'Offline',
        isReachable: pingResponse.alive,
        output: pingResponse.output,
        packetLoss: pingResponse.packetLoss,
    };
};
