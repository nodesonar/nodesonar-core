import { Poller } from '../../src/lib/poller/Poller';

import type { PingHost } from '../../src/types';

jest.setTimeout(30_000);

const LOOPBACK = '127.0.0.1';
const BLACKHOLE = '192.0.2.1';

const collect = (poller: Poller, host: string, n: number, interval = 300): Promise<PingHost.Response[]> =>
    new Promise((resolve) => {
        const results: PingHost.Response[] = [];

        poller.pollHost({ host, interval }, (res) => {
            results.push(res);

            if (results.length === n) {
                poller.stopPolling(host);
                resolve(results);
            }
        });
    });

describe('Poller (live)', () => {
    let poller: Poller;

    beforeEach(() => {
        poller = new Poller({ timeout: 2 });
    });

    afterEach(() => {
        poller.stopAll();
    });

    describe('pingHost', () => {
        it('reports loopback as reachable', async () => {
            const res = await poller.pingHost(LOOPBACK);

            expect(res.host).toBe(LOOPBACK);
            expect(res.isReachable).toBe(true);
            expect(res.status).toBe('Online');
            expect(res.packetLoss).toBe(0);
            expect(res.latency).not.toBeNull();
            expect(res.latency?.average).toBeGreaterThanOrEqual(0);
            expect(res.latency?.average).toBeLessThan(100);
        });

        it('reports a blackhole address as unreachable', async () => {
            const res = await poller.pingHost(BLACKHOLE);

            expect(res.isReachable).toBe(false);
            expect(res.status).toBe('Offline');
            expect(res.latency).toBeNull();
        });

        it('honours the configured packet count', async () => {
            const res = await new Poller({ count: 3, timeout: 2 }).pingHost(LOOPBACK);

            expect(res.count).toBe(3);
            expect(res.packetsReceived).toBe(3);
        });
    });

    describe('pollHost', () => {
        it('delivers repeated results on a real timer', async () => {
            const results = await collect(poller, LOOPBACK, 3);

            expect(results).toHaveLength(3);
            expect(results.every((r) => r.isReachable)).toBe(true);
        });

        it('polls reachable and unreachable hosts side by side', async () => {
            const [up, down] = await Promise.all([
                collect(poller, LOOPBACK, 2),
                collect(poller, BLACKHOLE, 2, 500),
            ]);

            expect(up.every((r) => r.isReachable)).toBe(true);
            expect(down.every((r) => !r.isReachable)).toBe(true);
        });

        it('stops delivering results after stopPolling', async () => {
            const cb = jest.fn();

            poller.pollHost({ host: LOOPBACK, interval: 200 }, cb);
            await new Promise((resolve) => setTimeout(resolve, 700));
            poller.stopPolling(LOOPBACK);

            await new Promise((resolve) => setTimeout(resolve, 1000));
            const settled = cb.mock.calls.length;

            await new Promise((resolve) => setTimeout(resolve, 1000));

            expect(settled).toBeGreaterThan(0);
            expect(cb).toHaveBeenCalledTimes(settled);
        });
    });
});
