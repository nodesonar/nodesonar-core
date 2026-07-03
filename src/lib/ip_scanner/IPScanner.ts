import { expandIpRange } from '../../utils/ipScannerUtils';
import { PingBase } from '../ping_base/PingBase';

import type { IPScan } from '../../types';

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
     * @returns A promise resolving to an array of all discovered devices.
     */
    async discover(range: string, onDeviceFound?: (device: IPScan.Discovered) => void): Promise<IPScan.Discovered[]> {
        const hosts = this.formatHostsFromRange(range);
        const discovered: IPScan.Discovered[] = [];

        for (const host of hosts) {
            const response = await this.ping(host);

            if (response.isReachable) {
                discovered.push(response);
                onDeviceFound?.(response);
            }
        }

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
