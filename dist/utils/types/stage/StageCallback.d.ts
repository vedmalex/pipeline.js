import { CallbackFunction } from '../CallbackFunction';
export type StageCallback<R> = Callback0Sync<R> | Callback0Async<R> | Callback1Async<R> | Callback1Sync<R> | Callback2Callback<R> | Callback2Async<R> | Callback3Callback<R>;
export type Callback0Sync<R> = () => R;
export type Callback0Async<R> = () => Promise<R>;
export type Callback1Sync<R> = (ctx: R) => R;
export type Callback1Async<R> = (ctx: R) => Promise<R>;
export type Callback2Async<R> = (err: unknown, ctx: R) => Promise<R>;
export type Callback2Callback<R> = (ctx: R, done: CallbackFunction<R>) => void;
export type Callback3Callback<R> = (err: unknown, ctx: R, done: CallbackFunction<R>) => void;
export declare function isCallback0Sync<R>(inp: unknown): inp is Callback0Sync<R>;
export declare function isCallback0Async<R>(inp: unknown): inp is Callback0Async<R>;
export declare function isCallback1Async<R>(inp: unknown): inp is Callback1Async<R>;
export declare function isCallback1Sync<R>(inp: unknown): inp is Callback1Sync<R>;
export declare function isCallback2Callback<R>(inp: unknown): inp is Callback2Callback<R>;
export declare function isCallback2Async<R>(inp: unknown): inp is Callback2Async<R>;
export declare function isCallback3Callback<R>(inp: unknown): inp is Callback3Callback<R>;
export declare function isStageCallbackFunction<R>(inp: any): inp is StageCallback<R>;
//# sourceMappingURL=StageCallback.d.ts.map