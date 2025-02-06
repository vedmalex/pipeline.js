export const nextTick = typeof process === 'object' && process !== null && process.nextTick || function nextTick<TArgs extends any[]>(cb: (...args: TArgs) => void, ...args: TArgs) {
    setTimeout(cb, 0, ...args);
};