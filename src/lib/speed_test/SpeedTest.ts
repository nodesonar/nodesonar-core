import { performance } from 'node:perf_hooks';
import { randomBytes } from 'node:crypto';
import { mbps } from './helper';

import type { SpeedTest as SPNS } from '../../types';

const DEFAULT_HOST = 'https://speed.cloudflare.com';

export class SpeedTest {
    private readonly host: string;
    constructor(options?: SPNS.Options) {
        const { host } = options ?? {};
        this.host = host ?? DEFAULT_HOST
    }

    public async measureLatency(samples = 10) {
        const times: number[] = [];
        for (let i = 0; i < samples; i++) {
            const t0 = performance.now();
            const res = await fetch(`${this.host}/__down?bytes=0`);
            await res.arrayBuffer();
            times.push(performance.now() - t0);
        }
        const sorted = [...times].sort((a, b) => a - b);
        const median = sorted[Math.floor(sorted.length / 2)];
        const jitter =
            times.slice(1).reduce((sum, t, i) => sum + Math.abs(t - times[i]), 0) /
            (times.length - 1);
        return { median, jitter };
    }

    public async measureDownload({ bytes = 25_000_000, streams = 4 } = {}) {
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

            })
        );
        return mbps(total, performance.now() - t0);
    }

    public async measureUpload({ bytes = 10_000_000, streams = 3 } = {}) {
        const payload = randomBytes(bytes);
        const t0 = performance.now();
        await Promise.all(
            Array.from({ length: streams }, async () => {
                const res = await fetch(`${this.host}/__up`, { method: 'POST', body: payload });
                await res.arrayBuffer();
            })
        );
        return mbps(bytes * streams, performance.now() - t0);
    }
}
