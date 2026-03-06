import { CleanError } from './ErrorList';
import { Possible, Rescue } from './types';
export declare function execute_rescue<T>(rescue: Rescue<T>, err: Error, context: T, done: (err?: Possible<CleanError>) => void): void;
//# sourceMappingURL=execute_rescue.d.ts.map