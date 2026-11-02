import type { PingHost } from '../../types';

export const setPacketLoss = (params: Pick<PingHost.PingResponseBase, 'alive' | 'packetLoss'>): number => {
    const { alive, packetLoss } = params;

    return (packetLoss === 'unknown' ? alive ? 0.00 : 100.00 : packetLoss) / 100;
};

export const formatPingResponse = (pingResponse: PingHost.PingResponseBase): PingHost.Response => {
    const packetLoss = setPacketLoss({ alive: pingResponse.alive, packetLoss: pingResponse.packetLoss });
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
            isReachable,
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
        isReachable,
        latency: null,
        status: 'Offline',
    };
};
