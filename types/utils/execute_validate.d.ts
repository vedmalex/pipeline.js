import { CallbackExternalFunction, ValidateFunction } from './types';
export declare function execute_validate<T>(validate: ValidateFunction<T>, context: T, done: CallbackExternalFunction<boolean>): void;
