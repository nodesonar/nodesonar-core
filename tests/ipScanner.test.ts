import { IPScanner } from '../src';
import { expandIpRange, inProgress } from '../src/lib/ip_scanner/helper';
import { IPScan } from '../src/types';

import type { PingHost } from '../src/types';

jest.mock('../src/lib/ip_scanner/helper.ts', () => ({
    ...jest.requireActual('../src/lib/ip_scanner/helper.ts'),
    expandIpRange: jest.fn(),
}));

type PingFn = (host: string) => Promise<PingHost.Response>;

const spyOnPing = (scanner: IPScanner): jest.SpyInstance<Promise<PingHost.Response>> => jest.spyOn(scanner as unknown as { ping: PingFn }, 'ping');

const START = '2026-01-01T00:00:00.000Z';
const LATENCY = { average: 10, fastest: 8, slowest: 12 };

const pingResponse = (host: string, isReachable: boolean): PingHost.Response =>
    ({ host, isReachable, latency: isReachable ? LATENCY : null }) as unknown as PingHost.Response;

const found = (host: string): IPScan.Discovered => ({ host, latency: LATENCY.average });

describe('IPScanner', () => {
    const mockedExpand = jest.mocked(expandIpRange);
    let scanner: IPScanner;
    let pingSpy: ReturnType<typeof spyOnPing>;

    beforeEach(() => {
        jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(START);

        scanner = new IPScanner();
        pingSpy = spyOnPing(scanner);
        mockedExpand.mockReset();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('constructor', () => {
        it('defaults the timeout to 1', () => {
            expect(scanner['options']).toMatchObject({ timeout: 1 });
        });

        it('uses a custom timeout when provided', () => {
            expect(new IPScanner({ timeout: 5 })['options']).toMatchObject({ timeout: 5 });
        });

        it('keeps a timeout of 0 instead of falling back to the default', () => {
            expect(new IPScanner({ timeout: 0 })['options']).toMatchObject({ timeout: 0 });
        });
    });

    describe('discover', () => {
        it('expands the range it is given', async () => {
            mockedExpand.mockReturnValue([]);

            await scanner.discover('192.168.1.0/24');

            expect(mockedExpand).toHaveBeenCalledWith('192.168.1.0/24');
            expect(mockedExpand).toHaveBeenCalledTimes(1);
        });

        it('returns an empty array without pinging when the range expands to nothing', async () => {
            mockedExpand.mockReturnValue([]);

            await expect(scanner.discover('empty')).resolves.toEqual([]);
            expect(pingSpy).not.toHaveBeenCalled();
        });

        it('pings every host in order', async () => {
            mockedExpand.mockReturnValue(['10.0.0.1', '10.0.0.2', '10.0.0.3']);
            pingSpy.mockImplementation(async (host) => pingResponse(host, true));

            await scanner.discover('10.0.0.1-3');

            expect(pingSpy.mock.calls.map(([host]) => host)).toEqual(['10.0.0.1', '10.0.0.2', '10.0.0.3']);
        });

        it('returns only reachable devices', async () => {
            mockedExpand.mockReturnValue(['a', 'b', 'c']);
            pingSpy.mockImplementation(async (host) => pingResponse(host, host !== 'b'));

            await expect(scanner.discover('x')).resolves.toEqual([found('a'), found('c')]);
        });

        it('returns an empty array when nothing is reachable', async () => {
            mockedExpand.mockReturnValue(['a', 'b']);
            pingSpy.mockImplementation(async (host) => pingResponse(host, false));

            await expect(scanner.discover('x')).resolves.toEqual([]);
        });

        it('keeps discovered devices in scan order', async () => {
            mockedExpand.mockReturnValue(['a', 'b', 'c']);
            pingSpy.mockImplementation(async (host) => pingResponse(host, true));

            const result = await scanner.discover('x');

            expect(result.map((d) => d.host)).toEqual(['a', 'b', 'c']);
        });

        it('reports the average latency of each device', async () => {
            mockedExpand.mockReturnValue(['a']);
            pingSpy.mockResolvedValue(pingResponse('a', true));

            await expect(scanner.discover('x')).resolves.toEqual([{ host: 'a', latency: 10 }]);
        });

        it('works without callbacks', async () => {
            mockedExpand.mockReturnValue(['a']);
            pingSpy.mockResolvedValue(pingResponse('a', true));

            await expect(scanner.discover('x')).resolves.toHaveLength(1);
        });

        describe('onDeviceFound', () => {
            it('is called once per reachable device with progress info', async () => {
                mockedExpand.mockReturnValue(['a', 'b', 'c']);
                pingSpy.mockImplementation(async (host) => pingResponse(host, host !== 'b'));
                const cb = jest.fn();

                await scanner.discover('x', cb);

                expect(cb).toHaveBeenCalledTimes(2);
                expect(cb).toHaveBeenNthCalledWith(1, inProgress('a', 1, LATENCY.average, START));
                expect(cb).toHaveBeenNthCalledWith(2, inProgress('c', 2, LATENCY.average, START));
            });

            it('is never called when nothing is reachable', async () => {
                mockedExpand.mockReturnValue(['a', 'b']);
                pingSpy.mockImplementation(async (host) => pingResponse(host, false));
                const cb = jest.fn();

                await scanner.discover('x', cb);

                expect(cb).not.toHaveBeenCalled();
            });

            it('fires as each device is found, before the scan completes', async () => {
                mockedExpand.mockReturnValue(['a', 'b']);

                let resolveSecond!: (value: PingHost.Response) => void;

                pingSpy.mockResolvedValueOnce(pingResponse('a', true));
                pingSpy.mockImplementationOnce(
                    () =>
                        new Promise((resolve) => {
                            resolveSecond = resolve;
                        }),
                );
                const cb = jest.fn();

                const promise = scanner.discover('x', cb);

                // Let the first ping resolve; the second is still pending.
                await new Promise(process.nextTick);

                expect(cb).toHaveBeenCalledTimes(1);
                expect(cb).toHaveBeenCalledWith(inProgress('a', 1, LATENCY.average, START));

                resolveSecond(pingResponse('b', true));
                await promise;

                expect(cb).toHaveBeenCalledTimes(2);
            });
        });

        describe('onComplete', () => {
            // Field names follow the shape your code emits (discoveredCount, status). Adjust if they differ.
            it('is called once after every host has been checked', async () => {
                mockedExpand.mockReturnValue(['a', 'b', 'c']);
                pingSpy.mockImplementation(async (host) => pingResponse(host, host !== 'b'));
                const onComplete = jest.fn();

                await scanner.discover('x', undefined, onComplete);

                expect(onComplete).toHaveBeenCalledTimes(1);
                expect(onComplete).toHaveBeenCalledWith(
                    expect.objectContaining({ discoveredCount: 2, status: IPScan.ScanStatus.COMPLETE }),
                );
                expect(pingSpy).toHaveBeenCalledTimes(3);
            });

            it('is called with a count of 0 when nothing is reachable', async () => {
                mockedExpand.mockReturnValue(['a', 'b']);
                pingSpy.mockImplementation(async (host) => pingResponse(host, false));
                const onComplete = jest.fn();

                await scanner.discover('x', undefined, onComplete);

                expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({ discoveredCount: 0 }));
            });
        });

        describe('execution model (documents current behaviour)', () => {
            it('pings sequentially: the next host waits for the previous ping', async () => {
                mockedExpand.mockReturnValue(['a', 'b']);

                let resolveFirst!: (value: PingHost.Response) => void;

                pingSpy.mockImplementationOnce(
                    () =>
                        new Promise((resolve) => {
                            resolveFirst = resolve;
                        }),
                );
                pingSpy.mockResolvedValueOnce(pingResponse('b', true));

                const promise = scanner.discover('x');

                await new Promise(process.nextTick);
                expect(pingSpy).toHaveBeenCalledTimes(1);

                resolveFirst(pingResponse('a', true));
                await promise;

                expect(pingSpy).toHaveBeenCalledTimes(2);
            });
        });

        describe('failures (documents current behaviour)', () => {
            it('rejects if ping rejects, discarding results found so far', async () => {
                mockedExpand.mockReturnValue(['a', 'b', 'c']);
                pingSpy
                    .mockResolvedValueOnce(pingResponse('a', true))
                    .mockRejectedValueOnce(new Error('boom'))
                    .mockResolvedValueOnce(pingResponse('c', true));
                const cb = jest.fn();

                await expect(scanner.discover('x', cb)).rejects.toThrow('boom');

                expect(cb).toHaveBeenCalledTimes(1); // 'a' was reported before the failure
                expect(pingSpy).toHaveBeenCalledTimes(2); // 'c' was never attempted
            });

            it('rejects if the range cannot be expanded, without pinging', async () => {
                mockedExpand.mockImplementation(() => {
                    throw new Error('Invalid range');
                });

                await expect(scanner.discover('garbage')).rejects.toThrow('Invalid range');
                expect(pingSpy).not.toHaveBeenCalled();
            });

            it('aborts the scan if the callback throws', async () => {
                mockedExpand.mockReturnValue(['a', 'b']);
                pingSpy.mockImplementation(async (host) => pingResponse(host, true));
                const cb = jest.fn(() => {
                    throw new Error('cb failed');
                });

                await expect(scanner.discover('x', cb)).rejects.toThrow('cb failed');
                expect(pingSpy).toHaveBeenCalledTimes(1);
            });
        });
    });
});
