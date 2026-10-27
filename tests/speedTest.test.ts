import { randomBytes } from 'node:crypto';
import { performance } from 'node:perf_hooks';

import { SpeedTest } from '../src';

jest.mock('node:crypto', () => ({
    randomBytes: jest.fn((n: number) => Buffer.alloc(n)),
}));

interface Internals {
    executeDownloadSpeed: (bytes?: number) => Promise<Response>;
    executeUploadSpeed: (payload: Buffer) => Promise<Response>;
    timeRequest: () => Promise<number>;
}

const internals = (speedTest: SpeedTest): Internals => speedTest as unknown as Internals;
const bodyOf = (bytes: number): Response => new Response(new Uint8Array(bytes));

describe('SpeedTest', () => {
    let speedTest: SpeedTest;
    let downloadSpy: jest.SpyInstance<Promise<Response>, [number?]>;
    let uploadSpy: jest.SpyInstance<Promise<Response>, [Buffer]>;
    let nowSpy: jest.SpyInstance<number, []>;

    const elapse = (elapsedMs: number): jest.SpyInstance<number, []> => nowSpy.mockReturnValueOnce(0).mockReturnValueOnce(elapsedMs);

    beforeEach(() => {
        speedTest = new SpeedTest();
        downloadSpy = jest.spyOn(internals(speedTest), 'executeDownloadSpeed');
        uploadSpy = jest.spyOn(internals(speedTest), 'executeUploadSpeed');
        nowSpy = jest.spyOn(performance, 'now');
        jest.mocked(randomBytes).mockClear();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('timeRequest', () => {
        it('returns the elapsed time of a zero-byte request', async () => {
            downloadSpy.mockResolvedValue(new Response(null));
            nowSpy.mockReturnValueOnce(100).mockReturnValueOnce(130);

            await expect(internals(speedTest).timeRequest()).resolves.toBe(30);
            expect(downloadSpy).toHaveBeenCalledWith();
        });

        it('propagates request failures', async () => {
            downloadSpy.mockRejectedValue(new Error('network down'));

            await expect(internals(speedTest).timeRequest()).rejects.toThrow('network down');
        });
    });

    describe('latency', () => {
        const withTimes = (...times: number[]): jest.SpyInstance<Promise<number>> => {
            const spy = jest.spyOn(internals(speedTest), 'timeRequest');

            times.forEach((t) => spy.mockResolvedValueOnce(t));

            return spy;
        };

        it('takes 10 samples by default', async () => {
            const spy = jest.spyOn(internals(speedTest), 'timeRequest').mockResolvedValue(5);

            await speedTest.latency();

            expect(spy).toHaveBeenCalledTimes(10);
        });

        it('takes the requested number of samples', async () => {
            const spy = jest.spyOn(internals(speedTest), 'timeRequest').mockResolvedValue(5);

            await speedTest.latency(3);

            expect(spy).toHaveBeenCalledTimes(3);
        });

        it('calculates the median and jitter for an odd sample count', async () => {
            withTimes(10, 30, 20);

            // sorted [10, 20, 30] -> median 20; jitter = (|30-10| + |20-30|) / 2 = 15
            await expect(speedTest.latency(3)).resolves.toEqual({ median: 20, jitter: 15 });
        });

        it('uses the upper-middle value as the median for an even sample count', async () => {
            withTimes(10, 20, 30, 40);

            const { median } = await speedTest.latency(4);

            expect(median).toBe(30);
        });

        it('reports zero jitter for identical samples', async () => {
            withTimes(7, 7, 7, 7);

            await expect(speedTest.latency(4)).resolves.toEqual({ median: 7, jitter: 0 });
        });

        it('measures jitter between consecutive samples, not versus the median', async () => {
            withTimes(10, 50, 10, 50);

            // |50-10| + |10-50| + |50-10| = 120 / 3 = 40
            const { jitter } = await speedTest.latency(4);

            expect(jitter).toBe(40);
        });

        it('requests samples sequentially', async () => {
            const order: string[] = [];

            jest.spyOn(internals(speedTest), 'timeRequest').mockImplementation(async () => {
                order.push('start');
                await Promise.resolve();
                order.push('end');

                return 1;
            });

            await speedTest.latency(2);

            expect(order).toEqual(['start', 'end', 'start', 'end']);
        });

        describe('edge cases (documents current behaviour)', () => {
            it('returns NaN jitter for a single sample', async () => {
                withTimes(12);

                const result = await speedTest.latency(1);

                expect(result.median).toBe(12);
                expect(result.jitter).toBeNaN();
            });
        });

        it('rejects if a request fails', async () => {
            jest.spyOn(internals(speedTest), 'timeRequest').mockRejectedValue(new Error('timeout'));

            await expect(speedTest.latency(3)).rejects.toThrow('timeout');
        });
    });

    describe('download', () => {
        it('uses 4 streams of 25,000,000 bytes by default', async () => {
            downloadSpy.mockImplementation(async () => bodyOf(10));
            elapse(1000);

            await speedTest.download();

            expect(downloadSpy).toHaveBeenCalledTimes(4);
            expect(downloadSpy).toHaveBeenCalledWith(25_000_000);
        });

        it('respects custom bytes and streams', async () => {
            downloadSpy.mockImplementation(async () => bodyOf(10));
            elapse(1000);

            await speedTest.download({ bytes: 1000, streams: 2 });

            expect(downloadSpy).toHaveBeenCalledTimes(2);
            expect(downloadSpy).toHaveBeenCalledWith(1000);
        });

        it('defaults each option independently', async () => {
            downloadSpy.mockImplementation(async () => bodyOf(10));
            elapse(1000);

            await speedTest.download({ streams: 2 });

            expect(downloadSpy).toHaveBeenCalledTimes(2);
            expect(downloadSpy).toHaveBeenCalledWith(25_000_000);
        });

        it('sums the bytes received across all streams', async () => {
            downloadSpy.mockImplementation(async () => bodyOf(125_000));
            elapse(1000);

            // 4 streams x 125,000 B = 500,000 B in 1s = 4 Mbps
            await expect(speedTest.download()).resolves.toBeCloseTo(4, 6);
        });

        it('scales with elapsed time', async () => {
            downloadSpy.mockImplementation(async () => bodyOf(125_000));
            elapse(2000);

            await expect(speedTest.download()).resolves.toBeCloseTo(2, 6);
        });

        it('counts a response with no body as zero bytes', async () => {
            downloadSpy.mockResolvedValue(new Response(null));
            elapse(1000);

            await expect(speedTest.download({ streams: 2 })).resolves.toBe(0);
        });

        it('starts all streams concurrently', async () => {
            const resolvers: Array<(res: Response) => void> = [];

            downloadSpy.mockImplementation(() => new Promise((resolve) => resolvers.push(resolve)));
            elapse(1000);

            const promise = speedTest.download({ streams: 3 });

            await new Promise(process.nextTick);
            expect(downloadSpy).toHaveBeenCalledTimes(3);

            resolvers.forEach((resolve) => resolve(bodyOf(10)));
            await promise;
        });

        it('rejects if any stream fails', async () => {
            downloadSpy.mockResolvedValueOnce(bodyOf(10)).mockRejectedValueOnce(new Error('reset'));

            await expect(speedTest.download({ streams: 2 })).rejects.toThrow('reset');
        });
    });

    describe('upload', () => {
        beforeEach(() => {
            uploadSpy.mockImplementation(async () => new Response('ok'));
        });

        it('uses 3 streams of 10,000,000 bytes by default', async () => {
            elapse(1000);

            await speedTest.upload();

            expect(uploadSpy).toHaveBeenCalledTimes(3);
            expect(uploadSpy.mock.calls.every(([payload]) => payload.length === 10_000_000)).toBe(true);
        });

        it('respects custom bytes and streams', async () => {
            elapse(1000);

            await speedTest.upload({ bytes: 500, streams: 2 });

            expect(uploadSpy).toHaveBeenCalledTimes(2);
            expect(uploadSpy.mock.calls.every(([payload]) => payload.length === 500)).toBe(true);
        });

        it('defaults each option independently', async () => {
            elapse(1000);

            await speedTest.upload({ bytes: 500 });

            expect(uploadSpy).toHaveBeenCalledTimes(3);
        });

        it('calculates Mbps from bytes x streams over the elapsed time', async () => {
            elapse(1000);

            // 3 x 10,000,000 B = 30 MB in 1s = 240 Mbps
            await expect(speedTest.upload()).resolves.toBeCloseTo(240, 6);
        });

        it('generates a payload for each stream (documents current behaviour)', async () => {
            elapse(1000);

            await speedTest.upload({ bytes: 100, streams: 3 });

            expect(randomBytes).toHaveBeenCalledTimes(3);
            expect(randomBytes).toHaveBeenCalledWith(100);
        });

        it('rejects if any upload fails', async () => {
            uploadSpy.mockRejectedValueOnce(new Error('upload failed'));

            await expect(speedTest.upload({ streams: 1 })).rejects.toThrow('upload failed');
        });
    });
});
