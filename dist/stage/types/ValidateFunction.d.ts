import { CallbackFunction } from './CallbackFunction';
import { Thenable } from './is_thenable';
export type ValidateFunction0Sync<R> = (this: R) => boolean;
export declare function isValidateFunction0Sync<R>(inp: unknown): inp is ValidateFunction0Sync<R>;
export type ValidateFunction1Sync<R> = (this: void, ctx: R) => boolean;
export declare function isValidateFunction1Sync<R>(inp: unknown): inp is ValidateFunction1Sync<R>;
export type ValidateFunction1Async<R> = (this: void, ctx: R) => Promise<boolean>;
export declare function isValidateFunction1Async<R>(inp: unknown): inp is ValidateFunction1Async<R>;
export type ValidateFunction1Thenable<R> = (this: void, ctx: R) => Thenable<boolean>;
export declare function isValidateFunction1Thenable<R>(inp: unknown): inp is ValidateFunction1Thenable<R>;
export type ValidateFunction2Sync<R> = (this: void, ctx: R, callback: CallbackFunction<boolean>) => void;
export declare function isValidateFunction2Sync<R>(inp: unknown): inp is ValidateFunction2Sync<R>;
export type ValidateFunction<R> = ValidateFunction0Sync<R> | ValidateFunction1Sync<R> | ValidateFunction1Async<R> | ValidateFunction1Thenable<R> | ValidateFunction2Sync<R>;
export declare function isValidateFunction<R>(inp: unknown): inp is ValidateFunction<R>;
export type ValidateSync<R> = (ctx: R) => R;
export type ValidateAsync<R> = (ctx: R) => Promise<R>;
export type ValidateCallback<R> = (ctx: R, done: CallbackFunction<R>) => void;
//# sourceMappingURL=ValidateFunction.d.ts.map