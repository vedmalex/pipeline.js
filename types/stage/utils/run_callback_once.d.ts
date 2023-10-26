import { CallbackFunction } from '../types';
export declare function run_callback_once<Input, Output>(wrapee: CallbackFunction<Input, Output>): CallbackFunction<Input, Output>;
