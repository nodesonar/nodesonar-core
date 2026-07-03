import { expandIpRange } from '../../src/utils/ipScannerUtils';

describe('expandIpRange', () => {

    describe('single IP', () => {
        it('should return an array with a single IP', () => {
            expect(expandIpRange('192.168.1.1')).toEqual(['192.168.1.1']);
        });

        it('should return an array with a single IP for 0.0.0.0', () => {
            expect(expandIpRange('0.0.0.0')).toEqual(['0.0.0.0']);
        });
    });

    describe('CIDR notation', () => {
        it('should expand /32 to a single IP', () => {
            expect(expandIpRange('192.168.1.1/32')).toEqual(['192.168.1.1']);
        });

        it('should expand /30 to 4 addresses', () => {
            expect(expandIpRange('192.168.1.0/30')).toEqual([
                '192.168.1.0',
                '192.168.1.1',
                '192.168.1.2',
                '192.168.1.3',
            ]);
        });

        it('should expand /24 to 256 addresses', () => {
            const result = expandIpRange('192.168.1.0/24');

            expect(result).toHaveLength(256);
            expect(result[0]).toBe('192.168.1.0');
            expect(result[255]).toBe('192.168.1.255');
        });

        it('should throw on invalid CIDR prefix', () => {
            expect(() => expandIpRange('192.168.1.0/33')).toThrow('Invalid CIDR prefix: 33');
        });
    });

    describe('short dash range (last octet)', () => {
        it('should expand 192.168.1.0-255 to 256 addresses', () => {
            const result = expandIpRange('192.168.1.0-255');

            expect(result).toHaveLength(256);
            expect(result[0]).toBe('192.168.1.0');
            expect(result[255]).toBe('192.168.1.255');
        });

        it('should expand a partial range', () => {
            expect(expandIpRange('192.168.1.10-12')).toEqual([
                '192.168.1.10',
                '192.168.1.11',
                '192.168.1.12',
            ]);
        });

        it('should return single address when start equals end', () => {
            expect(expandIpRange('192.168.1.5-5')).toEqual(['192.168.1.5']);
        });

        it('should throw when start octet is greater than end octet', () => {
            expect(() => expandIpRange('192.168.1.100-50')).toThrow('Start octet must be <= end octet');
        });
    });

    describe('full IP-to-IP dash range', () => {
        it('should expand a full IP range', () => {
            const result = expandIpRange('192.168.1.0-192.168.1.3');

            expect(result).toEqual([
                '192.168.1.0',
                '192.168.1.1',
                '192.168.1.2',
                '192.168.1.3',
            ]);
        });

        it('should return single address when start equals end', () => {
            expect(expandIpRange('192.168.1.1-192.168.1.1')).toEqual(['192.168.1.1']);
        });

        it('should throw when start IP is greater than end IP', () => {
            expect(() => expandIpRange('192.168.1.255-192.168.1.0')).toThrow('Start IP must be <= end IP');
        });
    });

    describe('wildcard', () => {
        it('should expand 192.168.1.* to 256 addresses', () => {
            const result = expandIpRange('192.168.1.*');

            expect(result).toHaveLength(256);
            expect(result[0]).toBe('192.168.1.0');
            expect(result[255]).toBe('192.168.1.255');
        });
    });

    describe('invalid input', () => {
        it('should throw on unrecognised format', () => {
            expect(() => expandIpRange('not-an-ip')).toThrow('Invalid dash range: not-an-ip');
        });

        it('should throw on invalid IP in range', () => {
            expect(() => expandIpRange('192.168.1.256/24')).toThrow('Invalid IP address');
        });
    });

});
