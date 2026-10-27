import { mbps } from '../../src/lib/speed_test/helper';

describe('mbps', () => {
    describe('known values', () => {
        it.each([
            { bytes: 125_000, ms: 1000, expected: 1 },
            { bytes: 1_000_000, ms: 1000, expected: 8 },
            { bytes: 25_000_000, ms: 2000, expected: 100 },
            { bytes: 12_500_000, ms: 100, expected: 1000 }, // gigabit
            { bytes: 1, ms: 1, expected: 0.008 },
        ])('$bytes bytes in $ms ms is $expected Mbps', ({ bytes, ms, expected }) => {
            expect(mbps(bytes, ms)).toBeCloseTo(expected, 6);
        });
    });

    describe('scaling', () => {
        it('doubles when bytes double', () => {
            expect(mbps(2_000_000, 1000)).toBeCloseTo(mbps(1_000_000, 1000) * 2, 6);
        });

        it('halves when time doubles', () => {
            expect(mbps(1_000_000, 2000)).toBeCloseTo(mbps(1_000_000, 1000) / 2, 6);
        });

        it('is unchanged when bytes and time scale together', () => {
            expect(mbps(5_000_000, 500)).toBeCloseTo(mbps(10_000_000, 1000), 6);
        });
    });

    describe('edge cases', () => {
        it('returns 0 for zero bytes', () => {
            expect(mbps(0, 1000)).toBe(0);
        });

        it('handles fractional milliseconds', () => {
            expect(mbps(125_000, 0.5)).toBeCloseTo(2000, 6);
        });

        it('handles very large byte counts without losing precision', () => {
            expect(mbps(10 ** 12, 1000)).toBeCloseTo(8_000_000, 6);
        });
    });

    describe('invalid input (documents current behaviour)', () => {
        it('returns Infinity when elapsed time is 0', () => {
            expect(mbps(1_000_000, 0)).toBe(Infinity);
        });

        it('returns NaN for 0 bytes in 0 ms', () => {
            expect(mbps(0, 0)).toBeNaN();
        });

        it('returns a negative speed for negative elapsed time', () => {
            expect(mbps(1_000_000, -1000)).toBeLessThan(0);
        });
    });
});
