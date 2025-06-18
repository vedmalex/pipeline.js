export declare function retryAfter<T>(promiseFactory: () => Promise<T> | T, timeout: number, maxAttempts?: number): Promise<T>;
