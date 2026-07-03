import { formatPingResponse } from '../../src/utils/pingUtils';

const basePingResponse = {
    inputHost: '192.168.1.1',
    host: '192.168.1.1',
    numeric_host: '192.168.1.1',
    alive: true,
    output: 'PING 192.168.1.1: 56 data bytes',
    time: 12.5,
    min: '10.0',
    max: '15.0',
    avg: '12.5',
    packetLoss: 0,
    stddev: '1.2',
};

describe('formatPingResponse', () => {

    it('should map host correctly', () => {
        const result = formatPingResponse(basePingResponse);

        expect(result.host).toBe('192.168.1.1');
    });

    it('should map responseMs from time', () => {
        const result = formatPingResponse(basePingResponse);

        expect(result.responseMs).toBe(12.5);
    });

    it('should map packetLoss correctly', () => {
        const result = formatPingResponse(basePingResponse);

        expect(result.packetLoss).toBe(0);
    });

    it('should map output correctly', () => {
        const result = formatPingResponse(basePingResponse);

        expect(result.output).toBe('PING 192.168.1.1: 56 data bytes');
    });

    describe('when device is reachable', () => {
        it('should set isReachable to true', () => {
            const result = formatPingResponse({ ...basePingResponse, alive: true });

            expect(result.isReachable).toBe(true);
        });

        it('should set status to Online', () => {
            const result = formatPingResponse({ ...basePingResponse, alive: true });

            expect(result.status).toBe('Online');
        });
    });

    describe('when device is not reachable', () => {
        it('should set isReachable to false', () => {
            const result = formatPingResponse({ ...basePingResponse, alive: false });

            expect(result.isReachable).toBe(false);
        });

        it('should set status to Offline', () => {
            const result = formatPingResponse({ ...basePingResponse, alive: false });

            expect(result.status).toBe('Offline');
        });
    });

});
