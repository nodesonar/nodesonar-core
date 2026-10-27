
export const arrayContructor = <T>(length: number, cb: (_: unknown, index: number) => T): T[] => Array.from({ length }, cb);

export const asyncArrayContructor = async <T>(length: number, cb: (_: unknown, index: number) => Promise<T>): Promise<Awaited<T>[]> => await Promise.all(arrayContructor(length, cb));

