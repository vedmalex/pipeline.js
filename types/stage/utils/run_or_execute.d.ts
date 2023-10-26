import { CallbackFunction } from '../types';
export declare function run_or_execute<Input, Output>(stage: unknown, err: unknown, context: Input, _done: CallbackFunction<Input, Output>): void;
export declare function run_or_execute_async<Input, Output>(stage: unknown, err: unknown, context: Input): Promise<[unknown, Output]>;
