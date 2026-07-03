import type { PingHost } from '../types';
import type { PingResponse } from 'ping/types/parser/base';

export const formatPingResponse = (pingResponse: PingResponse): PingHost.Response => {
    return {
        host: pingResponse.host,
        responseMs: pingResponse.time,
        status: pingResponse.alive ? 'Online' : 'Offline',
        isReachable: pingResponse.alive,
        output: pingResponse.output,
        packetLoss: pingResponse.packetLoss,
    };
};
