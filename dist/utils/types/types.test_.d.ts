type CallbackType<T> = (() => void) | ((err?: Error) => void) | ((err?: Error | undefined | null, value?: T) => void) | ((...args: any[]) => void);
export declare function process_error<T>(err: unknown, done: CallbackType<T>): void;
export {};
//# sourceMappingURL=types.test_.d.ts.map