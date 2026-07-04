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
    count: 4,
    packetLoss: '0',
    stddev: '1.2',
};

describe('formatPingResponse', () => {

    it('should map host correctly', () => {
        const result = formatPingResponse(basePingResponse);

        expect(result.host).toBe('192.168.1.1');
    });

    it('should map count correctly', () => {
        const result = formatPingResponse(basePingResponse);

        expect(result.count).toBe(4);
    });

    it('should map packetLoss correctly', () => {
        const result = formatPingResponse(basePingResponse);

        expect(result.packetLoss).toBe(0);
    });

    it('should map output correctly', () => {
        const result = formatPingResponse(basePingResponse);

        expect(result.output).toBe('PING 192.168.1.1: 56 data bytes');
    });

    describe('latency', () => {
        it('should map average latency from avg when reachable', () => {
            const result = formatPingResponse(basePingResponse);

            expect((result.latency as { average: number }).average).toBe(12.5);
        });

        it('should map slowest latency from max when reachable', () => {
            const result = formatPingResponse(basePingResponse);

            expect((result.latency as { slowest: number }).slowest).toBe(15);
        });

        it('should map fastest latency from min when reachable', () => {
            const result = formatPingResponse(basePingResponse);

            expect((result.latency as { fastest: number }).fastest).toBe(10);
        });

        it('should be null when device is not reachable', () => {
            const result = formatPingResponse({ ...basePingResponse, alive: false });

            expect(result.latency).toBeNull();
        });
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

    describe('when device is not reachable', () => {
        it('should set isReachable to false', () => {
            const result = formatPingResponse({ ...basePingResponse, alive: false });

            expect(result.isReachable).toBe(false);
        });

        it('should set status to Offline', () => {
            const result = formatPingResponse({ ...basePingResponse, alive: false });

            expect(result.status).toBe('Offline');
        });

        it('should set latency to null', () => {
            const result = formatPingResponse({ ...basePingResponse, alive: false });

            expect(result.latency).toBeNull();
        });
    });

    describe('packetLoss', () => {
        it('should return 0 when there is no packet loss', () => {
            const result = formatPingResponse({ ...basePingResponse, packetLoss: '0.000' });

            expect(result.packetLoss).toBe(0);
        });

        it('should return 0.25 when packet loss is 25%', () => {
            const result = formatPingResponse({ ...basePingResponse, packetLoss: '25.000' });

            expect(result.packetLoss).toBe(0.25);
        });

        it('should return 0.5 when packet loss is 50%', () => {
            const result = formatPingResponse({ ...basePingResponse, packetLoss: '50.000' });

            expect(result.packetLoss).toBe(0.5);
        });

        it('should return 0.75 when packet loss is 75%', () => {
            const result = formatPingResponse({ ...basePingResponse, packetLoss: '75.000' });

            expect(result.packetLoss).toBe(0.75);
        });

        it('should return 1 when packet loss is 100%', () => {
            const result = formatPingResponse({ ...basePingResponse, packetLoss: '100.000' });

            expect(result.packetLoss).toBe(1);
        });
    });

    describe('packetsReceived', () => {
        it('should return full count when there is no packet loss', () => {
            const result = formatPingResponse({ ...basePingResponse, count: 4, packetLoss: '0.000' });

            expect(result.packetsReceived).toBe(4);
        });

        it('should return 3 when 1 of 4 packets lost', () => {
            const result = formatPingResponse({ ...basePingResponse, count: 4, packetLoss: '25.000' });

            expect(result.packetsReceived).toBe(3);
        });

        it('should return 2 when 2 of 4 packets lost', () => {
            const result = formatPingResponse({ ...basePingResponse, count: 4, packetLoss: '50.000' });

            expect(result.packetsReceived).toBe(2);
        });

        it('should return 1 when 3 of 4 packets lost', () => {
            const result = formatPingResponse({ ...basePingResponse, count: 4, packetLoss: '75.000' });

            expect(result.packetsReceived).toBe(1);
        });

        it('should return 0 when all packets lost', () => {
            const result = formatPingResponse({ ...basePingResponse, count: 4, packetLoss: '100.000' });

            expect(result.packetsReceived).toBe(0);
        });
    });

});
