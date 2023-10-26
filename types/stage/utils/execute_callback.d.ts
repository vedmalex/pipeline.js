import { AnyStage, CallbackFunction } from '../types';
export declare function execute_callback<Input, Output>(this: AnyStage<Input, Output> | void, err: unknown, run: unknown, context: Input, _done: CallbackFunction<Input, Output>): void;
