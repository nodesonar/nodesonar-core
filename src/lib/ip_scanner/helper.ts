import { NodeSonarError } from '../../lib/error_base/NodeSonarError';
import { IPScan } from '../../types';
import { arrayContructor } from '../../utils';

const OCTET = '(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)';   // 0-255, no leading zeros
const IPV4 = new RegExp(`^${OCTET}(?:\\.${OCTET}){3}$`);
const OCTET_ONLY = new RegExp(`^${OCTET}$`);

const invalid = (range: string): NodeSonarError =>
    new NodeSonarError(`Invalid IP range: ${range}`);

/**
 * Validates an IP range string and returns how many addresses it covers,
 * without expanding it. Throws NodeSonarError if the range is invalid.
 */
export const countIpRange = (range: string): number => {
    if (IPV4.test(range)) return 1;

    if (range.includes('/')) {
        const parts = range.split('/');
        const [base, prefixStr] = parts;

        if (parts.length !== 2 || !IPV4.test(base) || !/^\d{1,2}$/.test(prefixStr)) throw invalid(range);

        const prefix = Number(prefixStr);

        if (prefix > 32) throw new NodeSonarError(`Invalid CIDR prefix: ${prefix}`);

        return 2 ** (32 - prefix);
    }

    if (range.includes('-')) {
        const parts = range.split('-');
        const [start, end] = parts;

        if (parts.length !== 2 || !IPV4.test(start)) throw invalid(range);

        if (IPV4.test(end)) {
            const size = ipToNumber(end) - ipToNumber(start) + 1;

            if (size < 1) throw new NodeSonarError('Start IP must be <= end IP');

            return size;
        }

        if (OCTET_ONLY.test(end)) {
            const size = Number(end) - Number(start.split('.')[3]) + 1;

            if (size < 1) throw new NodeSonarError('Start octet must be <= end octet');

            return size;
        }

        throw invalid(range);
    }

    if (range.includes('*')) {
        const octets = range.split('.');

        if (octets.length !== 4 || octets.some((o) => o !== '*' && !OCTET_ONLY.test(o))) throw invalid(range);

        return 256 ** octets.filter((o) => o === '*').length;
    }

    throw new NodeSonarError(`Unrecognised IP range format: ${range}`);
};

export const DEFAULT_MAX_ADDRESSES = 65_536;

export const expandIpRange = (range: string, maxAddresses = DEFAULT_MAX_ADDRESSES): string[] => {
    const count = countIpRange(range); // strict validation without allocating

    if (count > maxAddresses) {
        throw new NodeSonarError(
            `Range covers ${count.toLocaleString()} addresses, above the limit of ${maxAddresses.toLocaleString()}`,
        );
    }

    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(range)) {
        return [range];
    }

    if (range.includes('/')) {
        return expandCidr(range);
    }

    if (range.includes('-')) {
        return expandDashRange(range);
    }

    if (range.includes('*')) {
        return expandWildcard(range);
    }

    throw new NodeSonarError(`Unrecognised IP range format: ${range}`);
};

export const expandCidr = (cidr: string): string[] => {
    const [baseIp, prefixStr] = cidr.split('/');
    const prefix = parseInt(prefixStr, 10);

    if (prefix < 0 || prefix > 32) throw new NodeSonarError(`Invalid CIDR prefix: ${prefix}`);

    const baseNum = ipToNumber(baseIp);
    const hostBits = 32 - prefix;
    const networkAddress = baseNum & (~0 << hostBits);
    const count = Math.pow(2, hostBits);

    return numberToIpMap(count, networkAddress);
};

export const expandDashRange = (range: string): string[] => {
    const parts = range.split('-');

    if (parts.length === 2 && parts[1].includes('.')) {
        const start = ipToNumber(parts[0]);
        const end = ipToNumber(parts[1]);

        if (start > end) throw new NodeSonarError('Start IP must be <= end IP');

        return numberToIpMap(end - start + 1, start);
    }

    if (parts.length === 2) {
        const startEnd = parseInt(parts[1], 10);
        const octets = parts[0].split('.');

        if (octets.length !== 4) throw new NodeSonarError(`Invalid IP range: ${range}`);

        const startOctet = parseInt(octets[3], 10);
        const prefix = octets.slice(0, 3).join('.');

        if (startOctet > startEnd) throw new NodeSonarError('Start octet must be <= end octet');

        return arrayContructor(startEnd - startOctet + 1, (_, i) => `${prefix}.${startOctet + i}`);
    }

    throw new NodeSonarError(`Invalid dash range: ${range}`);
};

export const expandWildcard = (range: string): string[] => {
    const octets = range.split('.');

    if (octets.length !== 4) throw new NodeSonarError(`Invalid wildcard range: ${range}`);

    const results: string[] = [];

    function build(index: number, current: string[]): void {
        if (index === 4) {
            results.push(current.join('.'));

            return;
        }

        if (octets[index] === '*') {
            for (let i = 0; i <= 255; i++) build(index + 1, [...current, String(i)]);
        } else {
            build(index + 1, [...current, octets[index]]);
        }
    }

    build(0, []);

    return results;
};

export const ipToNumber = (ip: string): number => {
    const octets = ip.split('.').map(Number);

    if (octets.length !== 4 || octets.some((o) => o < 0 || o > 255)) {
        throw new NodeSonarError(`Invalid IP address: ${ip}`);
    }

    return (octets[0] << 24 | octets[1] << 16 | octets[2] << 8 | octets[3]) >>> 0;
};

export const numberToIp = (num: number): string => {
    return [
        (num >>> 24) & 255,
        (num >>> 16) & 255,
        (num >>> 8) & 255,
        num & 255,
    ].join('.');
};

export const numberToIpMap = (count: number, num: number): string[] => arrayContructor<string>(count, (_, i) => numberToIp(num + i));

export const inProgress = (host: string, discoveredCount: number, latency: IPScan.Discovered['latency'], startTime: string): IPScan.DiscoverInProgress => ({
    completedTime: null,
    discoveredCount,
    startTime,
    host: { host, latency },
    status: IPScan.ScanStatus.IN_PROGRESS,
    lastUpdated: new Date().toISOString(),
});
