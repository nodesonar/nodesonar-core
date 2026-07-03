export function expandIpRange(range: string): string[] {
    // Single IP
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(range)) {
        return [range];
    }

    // CIDR notation: 192.168.1.0/24
    if (range.includes('/')) {
        return expandCidr(range);
    }

    // Dash range on last octet: 192.168.1.0-255
    // or full IP range: 192.168.1.0-192.168.1.255
    if (range.includes('-')) {
        return expandDashRange(range);
    }

    // Wildcard: 192.168.1.*
    if (range.includes('*')) {
        return expandWildcard(range);
    }

    throw new Error(`Unrecognised IP range format: ${range}`);
}

function expandCidr(cidr: string): string[] {
    const [baseIp, prefixStr] = cidr.split('/');
    const prefix = parseInt(prefixStr, 10);

    if (prefix < 0 || prefix > 32) throw new Error(`Invalid CIDR prefix: ${prefix}`);

    const baseNum = ipToNumber(baseIp);
    const hostBits = 32 - prefix;
    const networkAddress = baseNum & (~0 << hostBits);
    const count = Math.pow(2, hostBits);

    return Array.from({ length: count }, (_, i) => numberToIp(networkAddress + i));
}

function expandDashRange(range: string): string[] {
    const parts = range.split('-');

    // Full IP-to-IP range: 192.168.1.0-192.168.1.255
    if (parts.length === 2 && parts[1].includes('.')) {
        const start = ipToNumber(parts[0]);
        const end = ipToNumber(parts[1]);

        if (start > end) throw new Error('Start IP must be <= end IP');

        return Array.from({ length: end - start + 1 }, (_, i) => numberToIp(start + i));
    }

    // Short dash range on last octet: 192.168.1.0-255
    if (parts.length === 2) {
        const startEnd = parseInt(parts[1], 10);
        const octets = parts[0].split('.');

        if (octets.length !== 4) throw new Error(`Invalid IP range: ${range}`);

        const startOctet = parseInt(octets[3], 10);
        const prefix = octets.slice(0, 3).join('.');

        if (startOctet > startEnd) throw new Error('Start octet must be <= end octet');

        return Array.from(
            { length: startEnd - startOctet + 1 },
            (_, i) => `${prefix}.${startOctet + i}`,
        );
    }

    throw new Error(`Invalid dash range: ${range}`);
}

function expandWildcard(range: string): string[] {
    const octets = range.split('.');

    if (octets.length !== 4) throw new Error(`Invalid wildcard range: ${range}`);

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
}

function ipToNumber(ip: string): number {
    const octets = ip.split('.').map(Number);

    if (octets.length !== 4 || octets.some((o) => o < 0 || o > 255)) {
        throw new Error(`Invalid IP address: ${ip}`);
    }

    return (octets[0] << 24 | octets[1] << 16 | octets[2] << 8 | octets[3]) >>> 0;
}

function numberToIp(num: number): string {
    return [
        (num >>> 24) & 255,
        (num >>> 16) & 255,
        (num >>> 8) & 255,
        num & 255,
    ].join('.');
}
