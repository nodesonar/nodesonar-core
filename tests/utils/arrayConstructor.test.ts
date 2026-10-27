import { arrayContructor, asyncArrayContructor } from '../../src/utils';

describe('arrayContructor', () => {
    it('returns an array of the requested length', () => {
        expect(arrayContructor(5, () => 'x')).toHaveLength(5);
    });

    it('returns an empty array for length 0 without calling the callback', () => {
        const cb = jest.fn();

        expect(arrayContructor(0, cb)).toEqual([]);
        expect(cb).not.toHaveBeenCalled();
    });

    it('calls the callback once per element', () => {
        const cb = jest.fn(() => 'x');

        arrayContructor(4, cb);

        expect(cb).toHaveBeenCalledTimes(4);
    });

    it('passes undefined as the first argument and the index as the second', () => {
        const cb = jest.fn((_: unknown, index: number) => index);

        arrayContructor(3, cb);

        expect(cb.mock.calls).toEqual([
            [undefined, 0],
            [undefined, 1],
            [undefined, 2],
        ]);
    });

    it('returns the callback results in index order', () => {
        expect(arrayContructor(4, (_, i) => i * 10)).toEqual([0, 10, 20, 30]);
    });

    it('works when the callback ignores its arguments', () => {
        expect(arrayContructor(3, () => 'a')).toEqual(['a', 'a', 'a']);
    });

    it('returns distinct objects when the callback creates them', () => {
        const result = arrayContructor(2, () => ({}));

        expect(result[0]).not.toBe(result[1]);
    });

    describe('unvalidated input (documents current behaviour)', () => {
        it.each([
            { label: 'negative', length: -3 },
            { label: 'NaN', length: NaN },
        ])('returns an empty array for $label length', ({ length }) => {
            expect(arrayContructor(length, () => 'x')).toEqual([]);
        });

        it('truncates fractional lengths', () => {
            expect(arrayContructor(2.9, (_, i) => i)).toEqual([0, 1]);
        });
    });
});

describe('asyncArrayContructor', () => {
    afterEach(() => {
        jest.useRealTimers();
    });

    it('resolves to an empty array for length 0 without calling the callback', async () => {
        const cb = jest.fn(async () => 'x');

        await expect(asyncArrayContructor(0, cb)).resolves.toEqual([]);
        expect(cb).not.toHaveBeenCalled();
    });

    it('calls the callback once per element with undefined and the index', async () => {
        const cb = jest.fn(async (_: unknown, index: number) => index);

        await asyncArrayContructor(3, cb);

        expect(cb.mock.calls).toEqual([
            [undefined, 0],
            [undefined, 1],
            [undefined, 2],
        ]);
    });

    it('resolves to the awaited values', async () => {
        await expect(asyncArrayContructor(3, async (_, i) => i + 1)).resolves.toEqual([1, 2, 3]);
    });

    it('preserves index order even when later items finish first', async () => {
        jest.useFakeTimers();

        const promise = asyncArrayContructor(3, async (_, i) => {
            await new Promise((resolve) => setTimeout(resolve, (3 - i) * 100));

            return i;
        });

        await jest.advanceTimersByTimeAsync(300);

        await expect(promise).resolves.toEqual([0, 1, 2]);
    });

    it('starts every callback concurrently rather than sequentially', async () => {
        jest.useFakeTimers();

        const started: number[] = [];
        const promise = asyncArrayContructor(3, async (_, i) => {
            started.push(i);
            await new Promise((resolve) => setTimeout(resolve, 1000));

            return i;
        });

        // All three have started before any timer fires. A sequential implementation would show [0].
        expect(started).toEqual([0, 1, 2]);

        await jest.advanceTimersByTimeAsync(1000);
        await promise;
    });

    it('takes roughly one delay in total, not the sum of delays', async () => {
        jest.useFakeTimers();

        let settled = false;
        const promise = asyncArrayContructor(3, async () => {
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }).then(() => {
            settled = true;
        });

        await jest.advanceTimersByTimeAsync(1000);

        expect(settled).toBe(true);
        await promise;
    });

    it('rejects if any callback rejects', async () => {
        const promise = asyncArrayContructor(3, async (_, i) => {
            if (i === 1) {
                throw new Error('boom');
            }

            return i;
        });

        await expect(promise).rejects.toThrow('boom');
    });

    it('still starts every callback when one of them fails', async () => {
        const cb = jest.fn(async (_: unknown, i: number) => {
            if (i === 0) {
                throw new Error('boom');
            }

            return i;
        });

        await expect(asyncArrayContructor(3, cb)).rejects.toThrow('boom');
        expect(cb).toHaveBeenCalledTimes(3);
    });

    describe('unvalidated input (documents current behaviour)', () => {
        it.each([
            { label: 'negative', length: -3 },
            { label: 'NaN', length: NaN },
        ])('resolves to an empty array for $label length', async ({ length }) => {
            await expect(asyncArrayContructor(length, async () => 'x')).resolves.toEqual([]);
        });
    });
});
