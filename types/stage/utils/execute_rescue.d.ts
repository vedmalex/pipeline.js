import { CallbackFunction, Rescue } from '../types';
export declare function execute_rescue<Input, Output>(rescue: Rescue, err: Error, context: unknown, done: CallbackFunction<Input, Output>): void;
export declare function execute_rescue_async(rescue: Rescue, err: Error, context: unknown): Promise<[unknown, unknown]>;
