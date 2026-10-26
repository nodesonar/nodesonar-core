
export const mbps = (bytes: number, ms: number): number => (bytes * 8) / (ms / 1000) / 1e6;
