import type { PingHost } from '../../types';

export const formatPingResponse = (pingResponse: PingHost.PingResponseBase): PingHost.Response => {
    const packetLoss = (pingResponse.packetLoss === 'unknown' ? 100.00 : pingResponse.packetLoss) / 100;
    const isReachable = pingResponse.alive;

    const baseResponse = {
        count: pingResponse.count,
        host: pingResponse.host,
        output: pingResponse.output,
        packetLoss,
        packetsReceived: Math.round(pingResponse.count * (1 - packetLoss)),
        timestamp: new Date().toISOString(),
    };

    if (isReachable) {
        return {
            ...baseResponse,
            isReachable: true,
            latency: {
                average: Number(pingResponse.avg),
                slowest: Number(pingResponse.max),
                fastest: Number(pingResponse.min),
            },
            status: 'Online',
        };
    }

    return {
        ...baseResponse,
        latency: null,
        isReachable: false,
        status: 'Offline',
    };
};
