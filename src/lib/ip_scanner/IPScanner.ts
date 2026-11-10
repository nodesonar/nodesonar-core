import { IPScan } from '../../types';
import { PingBase } from '../ping_base/PingBase';

import { expandIpRange, inProgress } from './helper';

export class IPScanner extends PingBase {
    constructor(options?: IPScan.Options) {
        super({ timeout: options?.timeout ?? 1 });
    }

    /**
     * Discovers reachable devices within a given IP range.
     * Supports CIDR (192.168.1.0/24), dash (192.168.1.0-255), full IP range (192.168.1.0-192.168.1.255),
     * and wildcard (192.168.1.*) notation.
     * @param range - The IP range to scan.
     * @param onDeviceFound - Optional callback invoked with each discovered device as it is found.
     * @param onComplete - Optional callback invoked after the the the method has completed.
     * @returns A promise resolving to an array of all discovered devices.
     */
    async discover(range: string, onDeviceFound?: (device: IPScan.DiscoverInProgress) => void, onComplete?: (info: IPScan.DiscoveComplete) => void): Promise<IPScan.Discovered[]> {
        const startTime = new Date().toISOString();
        const hosts = this.formatHostsFromRange(range);
        const discovered: IPScan.Discovered[] = [];

        for (var i = 0; i < hosts.length; i++) {
            const host = hosts[i];
            const response = await this.ping(host);

            if (response.isReachable) {
                const { host, latency: { average } } = response;

                discovered.push({ host, latency: average });
                onDeviceFound?.(inProgress(response.host, discovered.length, response.latency.average, startTime));
            }
        }

        onComplete?.({
            completedTime: new Date().toISOString(),
            discoveredCount: discovered.length,
            host: null,
            lastUpdated: new Date().toISOString(),
            startTime,
            status: IPScan.ScanStatus.COMPLETE,
        });

        return discovered;
    }

    /**
     * Parses an IP range string into an array of individual IP addresses.
     * @param range - The IP range string to expand.
     * @returns An array of IP address strings.
     */
    private formatHostsFromRange(range: string): string[] {
        return expandIpRange(range);
    }
}
