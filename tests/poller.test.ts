import { NodeSonarError } from '../src/lib/error_base/NodeSonarError';
import { Poller } from '../src/lib/poller/Poller';

import type { PingHost } from '../src/types';

type PingFn = (host: string) => Promise<PingHost.Response>;

const spyOnPing = (poller: Poller): jest.SpyInstance<Promise<PingHost.Response>> => jest.spyOn(poller as unknown as { ping: PingFn }, 'ping');

const response = { host: '1.1.1.1', alive: true } as unknown as PingHost.Response;

describe('Poller', () => {
    let poller: Poller;
    let pingSpy: jest.SpyInstance<Promise<PingHost.Response>, [string]>;

    beforeEach(() => {
        jest.useFakeTimers();
        poller = new Poller();
        pingSpy = spyOnPing(poller).mockResolvedValue(response);
    });

    afterEach(() => {
        poller.stopAll();
        jest.useRealTimers();
        jest.restoreAllMocks();
    });

    describe('config', () => {
        it('returns the options held by the instance', () => {
            expect(poller.config).toBe(poller['options']);
        });
    });

    describe('pollHost', () => {
        it('does not ping or call back before the first interval elapses', async () => {
            const cb = jest.fn();

            poller.pollHost({ host: '1.1.1.1' }, cb);
            await jest.advanceTimersByTimeAsync(999);

            expect(pingSpy).not.toHaveBeenCalled();
            expect(cb).not.toHaveBeenCalled();
        });

        it('defaults to a 1000ms interval', async () => {
            const cb = jest.fn();

            poller.pollHost({ host: '1.1.1.1' }, cb);
            await jest.advanceTimersByTimeAsync(1000);

            expect(cb).toHaveBeenCalledTimes(1);
        });

        it('respects a custom interval', async () => {
            const cb = jest.fn();

            poller.pollHost({ host: '1.1.1.1', interval: 250 }, cb);
            await jest.advanceTimersByTimeAsync(1000);

            expect(cb).toHaveBeenCalledTimes(4);
        });

        it('pings the configured host and passes the result to the callback', async () => {
            const cb = jest.fn();

            poller.pollHost({ host: '8.8.8.8' }, cb);
            await jest.advanceTimersByTimeAsync(1000);

            expect(pingSpy).toHaveBeenCalledWith('8.8.8.8');
            expect(cb).toHaveBeenCalledWith(response);
        });

        it('keeps polling on every interval', async () => {
            const cb = jest.fn();

            poller.pollHost({ host: '1.1.1.1' }, cb);
            await jest.advanceTimersByTimeAsync(3000);

            expect(cb).toHaveBeenCalledTimes(3);
        });

        it('adds the host to activeHosts', () => {
            poller.pollHost({ host: '1.1.1.1' }, jest.fn());

            expect(poller.activeHosts).toEqual(['1.1.1.1']);
        });

        it('polls multiple hosts independently', async () => {
            const cbA = jest.fn();
            const cbB = jest.fn();

            poller.pollHost({ host: 'a.test', interval: 500 }, cbA);
            poller.pollHost({ host: 'b.test', interval: 1000 }, cbB);
            await jest.advanceTimersByTimeAsync(1000);

            expect(cbA).toHaveBeenCalledTimes(2);
            expect(cbB).toHaveBeenCalledTimes(1);
            expect(pingSpy).toHaveBeenCalledWith('a.test');
            expect(pingSpy).toHaveBeenCalledWith('b.test');
        });

        it('replaces the existing interval when the same host is polled again', async () => {
            const first = jest.fn();
            const second = jest.fn();

            poller.pollHost({ host: '1.1.1.1' }, first);
            poller.pollHost({ host: '1.1.1.1' }, second);
            await jest.advanceTimersByTimeAsync(1000);

            expect(first).not.toHaveBeenCalled();
            expect(second).toHaveBeenCalledTimes(1);
            expect(poller.activeHosts).toEqual(['1.1.1.1']);
        });

        it('only runs one timer per host after re-polling', async () => {
            poller.pollHost({ host: '1.1.1.1' }, jest.fn());
            poller.pollHost({ host: '1.1.1.1' }, jest.fn());

            expect(jest.getTimerCount()).toBe(1);
        });
    });

    describe('stopPolling', () => {
        it('stops further callbacks', async () => {
            const cb = jest.fn();

            poller.pollHost({ host: '1.1.1.1' }, cb);
            await jest.advanceTimersByTimeAsync(2000);
            poller.stopPolling('1.1.1.1');
            await jest.advanceTimersByTimeAsync(5000);

            expect(cb).toHaveBeenCalledTimes(2);
        });

        it('removes the host from activeHosts', () => {
            poller.pollHost({ host: '1.1.1.1' }, jest.fn());
            poller.stopPolling('1.1.1.1');

            expect(poller.activeHosts).toEqual([]);
        });

        it('only stops the requested host', async () => {
            const cbA = jest.fn();
            const cbB = jest.fn();

            poller.pollHost({ host: 'a.test' }, cbA);
            poller.pollHost({ host: 'b.test' }, cbB);
            poller.stopPolling('a.test');
            await jest.advanceTimersByTimeAsync(1000);

            expect(cbA).not.toHaveBeenCalled();
            expect(cbB).toHaveBeenCalledTimes(1);
            expect(poller.activeHosts).toEqual(['b.test']);
        });

        it('throws a NodeSonarError for a host that is not being polled', () => {
            expect(() => poller.stopPolling('nope.test')).toThrow(NodeSonarError);
            expect(() => poller.stopPolling('nope.test')).toThrow('Host \'nope.test\' is not currently being polled');
        });

        it('throws when the same host is stopped twice', () => {
            poller.pollHost({ host: '1.1.1.1' }, jest.fn());
            poller.stopPolling('1.1.1.1');

            expect(() => poller.stopPolling('1.1.1.1')).toThrow(NodeSonarError);
        });
    });

    describe('stopAll', () => {
        it('stops every host and clears activeHosts', async () => {
            const cbA = jest.fn();
            const cbB = jest.fn();

            poller.pollHost({ host: 'a.test' }, cbA);
            poller.pollHost({ host: 'b.test' }, cbB);
            poller.stopAll();
            await jest.advanceTimersByTimeAsync(5000);

            expect(cbA).not.toHaveBeenCalled();
            expect(cbB).not.toHaveBeenCalled();
            expect(poller.activeHosts).toEqual([]);
            expect(jest.getTimerCount()).toBe(0);
        });

        it('does not throw when nothing is being polled', () => {
            expect(() => poller.stopAll()).not.toThrow();
        });

        it('allows a host to be polled again afterwards', async () => {
            const cb = jest.fn();

            poller.pollHost({ host: '1.1.1.1' }, jest.fn());
            poller.stopAll();
            poller.pollHost({ host: '1.1.1.1' }, cb);
            await jest.advanceTimersByTimeAsync(1000);

            expect(cb).toHaveBeenCalledTimes(1);
        });
    });

    describe('activeHosts', () => {
        it('is empty by default', () => {
            expect(poller.activeHosts).toEqual([]);
        });

        it('lists hosts in the order they were added', () => {
            poller.pollHost({ host: 'b.test' }, jest.fn());
            poller.pollHost({ host: 'a.test' }, jest.fn());

            expect(poller.activeHosts).toEqual(['b.test', 'a.test']);
        });

        it('returns a copy, so mutating it does not affect polling', () => {
            poller.pollHost({ host: '1.1.1.1' }, jest.fn());
            poller.activeHosts.push('injected.test');

            expect(poller.activeHosts).toEqual(['1.1.1.1']);
        });
    });

    describe('pingHost', () => {
        it('delegates to ping and returns the result', async () => {
            await expect(poller.pingHost('9.9.9.9')).resolves.toBe(response);
            expect(pingSpy).toHaveBeenCalledWith('9.9.9.9');
            expect(pingSpy).toHaveBeenCalledTimes(1);
        });

        it('propagates rejections from ping', async () => {
            pingSpy.mockRejectedValueOnce(new Error('unreachable'));

            await expect(poller.pingHost('9.9.9.9')).rejects.toThrow('unreachable');
        });
    });
});
