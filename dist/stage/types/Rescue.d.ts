import { CallbackFunction } from './CallbackFunction';
export type Rescue1Sync = <R>(this: R, ctx: Error) => any;
export type Rescue1ASync = <R>(this: R, ctx: Error) => Promise<void>;
export type Rescue2ASync = <R>(this: null, err: Error, ctx: R) => Promise<void>;
export type Rescue2Sync = <R>(this: null, err: Error, ctx: R) => R;
export type Rescue3Callback = <R>(this: null, err: Error, ctx: R, done: CallbackFunction<R>) => void;
export declare function isRescue1Sync(inp: unknown): inp is Rescue1Sync;
export declare function isRescue1ASync(inp: unknown): inp is Rescue1ASync;
export declare function isRescue2ASync(inp: unknown): inp is Rescue2ASync;
export declare function isRescue3Callback(inp: unknown): inp is Rescue3Callback;
export declare function isRescue2Sync(inp: unknown): inp is Rescue2Sync;
export declare function isRescue(inp: unknown): inp is Rescue;
export type Rescue = Rescue1Sync | Rescue1ASync | Rescue2ASync | Rescue2Sync | Rescue3Callback;
//# sourceMappingURL=Rescue.d.ts.map