import type { PingHost } from '../types';

export const formatPingResponse = (pingResponse: PingHost.PingResponseBase): PingHost.Response => {
    return {
        host: pingResponse.host,
        latency: pingResponse.alive ? {
            average: Number(pingResponse.avg),
            slowest: Number(pingResponse.max),
            fastest: Number(pingResponse.min),
        } : null,
        count: pingResponse.count,
        status: pingResponse.alive ? 'Online' : 'Offline',
        isReachable: pingResponse.alive,
        output: pingResponse.output,
        packetLoss: parseFloat(pingResponse.packetLoss) / 100,
        packetsReceived: Math.round(pingResponse.count * (1 - parseFloat(pingResponse.packetLoss) / 100)),
    };
};
