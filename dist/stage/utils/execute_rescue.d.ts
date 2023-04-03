import { Rescue } from '../types';
export declare function execute_rescue<R>(rescue: Rescue<R>, err: Error, context: unknown, done: (err?: any) => void): void;
export declare function execute_rescue_async<R>(rescue: Rescue<R>, err: Error, context: R): Promise<[unknown, R]>;
//# sourceMappingURL=execute_rescue.d.ts.map