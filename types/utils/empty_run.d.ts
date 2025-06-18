import { CleanError } from './ErrorList';
import { CallbackFunction, Possible, StageObject } from './types';
export declare function empty_run<T extends StageObject>(err: Possible<CleanError>, context: T, done: CallbackFunction<T>): Promise<void>;
