import { randomBytes } from 'node:crypto';
import { performance } from 'node:perf_hooks';

import { mbps } from './helper';

import type { SpeedTest as SPNS } from '../../types';

export class SpeedTest {
    private readonly host: string;

    /**
     * Creates a speed test client targeting Cloudflare's public speed test endpoints.
     */
    constructor() {
        this.host = 'https://speed.cloudflare.com';
    }

    /**
     * Measures round-trip latency and jitter by issuing sequential zero-byte requests.
     * Latency is an HTTP round trip, so it will read slightly higher than ICMP ping.
     * @param samples - Number of requests to sample (default: 10).
     * @returns A promise resolving to the median latency and jitter, both in ms. Jitter is the
     * mean absolute difference between consecutive samples.
     */
    public async latency(samples = 10): Promise<SPNS.Measure.LatencyResponse> {
        const times = await Array.fromAsync({ length: samples }, () => this.timeRequest());

        const sorted = [...times].sort((a, b) => a - b);
        const median = sorted[Math.floor(sorted.length / 2)];
        const jitter = times.slice(1).reduce((sum, t, i) => sum + Math.abs(t - times[i]), 0) / (times.length - 1);

        return { median, jitter };
    }

    /**
     * Measures download throughput by fetching payloads over several parallel connections
     * and timing how long it takes to consume every response body.
     * @param options - Test configuration: `bytes` is the payload size requested per stream
     * (default: 25,000,000) and `streams` is the number of parallel requests (default: 4).
     * @returns A promise resolving to the aggregate download speed in Mbps.
     */
    public async download(options?: SPNS.Measure.Options): Promise<SPNS.Measure.Response> {
        const { bytes = 25_000_000, streams = 4 } = options ?? {};
        let total = 0;
        const t0 = performance.now();

        await Promise.all(
            Array.from({ length: streams }, async () => {
                const res = await fetch(`${this.host}/__down?bytes=${bytes}`);

                if (res.body) {
                    for await (const chunk of res.body) total += chunk.length;
                } else {
                    total += 0;
                }

            }),
        );

        return mbps(total, performance.now() - t0);
    }

    /**
     * Measures upload throughput by POSTing the same random payload over several parallel
     * connections and timing until every request completes.
     * @param options - Test configuration: `bytes` is the payload size sent per stream
     * (default: 10,000,000) and `streams` is the number of parallel requests (default: 3).
     * @returns A promise resolving to the aggregate upload speed in Mbps.
     */
    public async upload(options?: SPNS.Measure.Options): Promise<SPNS.Measure.Response> {
        const { bytes = 10_000_000, streams = 3 } = options ?? {};
        const payload = randomBytes(bytes);
        const t0 = performance.now();

        await Promise.all(
            Array.from({ length: streams }, async () => {
                const res = await fetch(`${this.host}/__up`, { method: 'POST', body: payload });

                await res.arrayBuffer();
            }),
        );

        return mbps(bytes * streams, performance.now() - t0);
    }

    /**
 * Times a single zero-byte round trip to the speed test host.
 * @returns The elapsed time in ms.
 */
    private async timeRequest(): Promise<number> {
        const t0 = performance.now();
        const res = await fetch(`${this.host}/__down?bytes=0`);

        await res.arrayBuffer();

        return performance.now() - t0;
    }
}
