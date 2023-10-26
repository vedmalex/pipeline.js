import { CallbackFunction, ValidateFunction } from '../types';
export declare function execute_validate<Input>(validate: ValidateFunction<Input>, context: Input, done: CallbackFunction<boolean, boolean>): void;
