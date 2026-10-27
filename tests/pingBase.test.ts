import ping from 'ping';

import { formatPingResponse } from '../src/lib/ping_base/helper';
import { PingBase } from '../src/lib/ping_base/PingBase';

import type { PingHost } from '../src/types';

jest.mock('ping', () => ({
    __esModule: true,
    default: { promise: { probe: jest.fn() } },
}));
jest.mock('../src/lib/ping_base/helper');

class TestPinger extends PingBase {
    public run(host: string): Promise<PingHost.Response> {
        return this.ping(host);
    }

    public get opts(): Required<PingHost.Options> {
        return this.options;
    }
}

describe('PingBase', () => {
    const probe = jest.mocked(ping.promise.probe);
    const format = jest.mocked(formatPingResponse);
    const formatted = { formatted: true } as unknown as PingHost.Response;

    const probeResponse = (overrides: Record<string, unknown> = {}): Awaited<ReturnType<typeof ping.promise.probe>> =>
        ({ alive: true, time: 12, packetLoss: '0.000', ...overrides }) as unknown as Awaited<ReturnType<typeof ping.promise.probe>>;

    beforeEach(() => {
        probe.mockReset().mockResolvedValue(probeResponse());
        format.mockReset().mockReturnValue(formatted);
    });

    describe('options', () => {
        it('applies defaults when no options are given', () => {
            expect(new TestPinger().opts).toEqual({ count: 1, timeout: 10, packetSize: 32, extra: [] });
        });

        it('overrides only the options provided', () => {
            expect(new TestPinger({ timeout: 3 }).opts).toEqual({ count: 1, timeout: 3, packetSize: 32, extra: [] });
        });

        it('accepts a full set of options', () => {
            const options = { count: 4, timeout: 2, packetSize: 64, extra: ['-n'] };

            expect(new TestPinger(options).opts).toEqual(options);
        });

        it('does not leak one instance’s overrides into another', () => {
            new TestPinger({ timeout: 99 });

            expect(new TestPinger().opts.timeout).toBe(10);
        });

        describe('edge cases (documents current behaviour)', () => {
            it('lets an explicit undefined overwrite a default', () => {
                // `{ ...DEFAULT_OPTIONS, ...options }` copies undefined values over the defaults.
                expect(new TestPinger({ timeout: undefined }).opts.timeout).toBeUndefined();
            });

            it('shares the default `extra` array between instances', () => {
                expect(new TestPinger().opts.extra).toBe(new TestPinger().opts.extra);
            });
        });
    });

    describe('ping', () => {
        it('probes the given host', async () => {
            await new TestPinger().run('1.1.1.1');

            expect(probe).toHaveBeenCalledTimes(1);
            expect(probe).toHaveBeenCalledWith('1.1.1.1', expect.any(Object));
        });

        it('maps the default options onto the probe options', async () => {
            await new TestPinger().run('1.1.1.1');

            expect(probe).toHaveBeenCalledWith('1.1.1.1', {
                timeout: 10,
                extra: [],
                packetSize: 32,
                min_reply: 1,
            });
        });

        it('maps custom options, with count becoming min_reply', async () => {
            await new TestPinger({ count: 5, timeout: 2, packetSize: 64, extra: ['-n'] }).run('example.test');

            expect(probe).toHaveBeenCalledWith('example.test', {
                timeout: 2,
                extra: ['-n'],
                packetSize: 64,
                min_reply: 5,
            });
        });

        it('passes the probe response, count, host and a string packetLoss to the formatter', async () => {
            probe.mockResolvedValue(probeResponse({ time: 42, packetLoss: '0.000' }));

            await new TestPinger({ count: 3 }).run('1.1.1.1');

            expect(format).toHaveBeenCalledWith({
                alive: true,
                time: 42,
                packetLoss: '0.000',
                count: 3,
                host: '1.1.1.1',
            });
        });

        it('converts a numeric packetLoss to a string', async () => {
            probe.mockResolvedValue(probeResponse({ packetLoss: 25 }));

            await new TestPinger().run('1.1.1.1');

            expect(format).toHaveBeenCalledWith(expect.objectContaining({ packetLoss: '25' }));
        });

        it('uses the requested host even if the probe response contains a different one', async () => {
            probe.mockResolvedValue(probeResponse({ host: 'resolved.test' }));

            await new TestPinger().run('requested.test');

            expect(format).toHaveBeenCalledWith(expect.objectContaining({ host: 'requested.test' }));
        });

        it('returns whatever the formatter returns', async () => {
            await expect(new TestPinger().run('1.1.1.1')).resolves.toBe(formatted);
        });

        it('rejects without formatting when the probe rejects', async () => {
            probe.mockRejectedValue(new Error('spawn failed'));

            await expect(new TestPinger().run('1.1.1.1')).rejects.toThrow('spawn failed');
            expect(format).not.toHaveBeenCalled();
        });

        it('rejects when the probe response has no packetLoss (documents current behaviour)', async () => {
            probe.mockResolvedValue(probeResponse({ packetLoss: undefined }));

            await expect(new TestPinger().run('1.1.1.1')).rejects.toThrow(TypeError);
        });

        it('rejects when the formatter throws', async () => {
            format.mockImplementation(() => {
                throw new Error('bad response');
            });

            await expect(new TestPinger().run('1.1.1.1')).rejects.toThrow('bad response');
        });
    });
});
