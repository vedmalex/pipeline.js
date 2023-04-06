import { CallbackFunction } from './CallbackFunction';
import { StageObject } from './StageObject';
export type StageCallback<R extends StageObject> = Callback0Sync<R> | Callback0Async<R> | Callback1Async<R> | Callback1Sync<R> | Callback2Callback<R> | Callback2Async<R> | Callback3Callback<R>;
export type Callback0Sync<R extends StageObject> = () => R;
export type Callback0Async<R extends StageObject> = () => Promise<R>;
export type Callback1Sync<R extends StageObject> = (ctx: R) => R;
export type Callback1Async<R extends StageObject> = (ctx: R) => Promise<R>;
export type Callback2Async<R extends StageObject> = (err: unknown, ctx: R) => Promise<R>;
export type Callback2Callback<R extends StageObject> = (ctx: R, done: CallbackFunction<R>) => void;
export type Callback3Callback<R extends StageObject> = (err: unknown, ctx: R, done: CallbackFunction<R>) => void;
export declare function isCallback0Sync<R extends StageObject>(inp: unknown): inp is Callback0Sync<R>;
export declare function isCallback0Async<R extends StageObject>(inp: unknown): inp is Callback0Async<R>;
export declare function isCallback1Async<R extends StageObject>(inp: unknown): inp is Callback1Async<R>;
export declare function isCallback1Sync<R extends StageObject>(inp: unknown): inp is Callback1Sync<R>;
export declare function isCallback2Callback<R extends StageObject>(inp: unknown): inp is Callback2Callback<R>;
export declare function isCallback2Async<R extends StageObject>(inp: unknown): inp is Callback2Async<R>;
export declare function isCallback3Callback<R extends StageObject>(inp: unknown): inp is Callback3Callback<R>;
export declare function isStageCallbackFunction<R extends StageObject>(inp: any): inp is StageCallback<R>;
//# sourceMappingURL=StageCallback.d.ts.map