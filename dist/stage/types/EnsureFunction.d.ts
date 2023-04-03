import * as z from 'zod';
import { CallbackFunction } from './CallbackFunction';
export type EnsureSync<R> = (ctx: R) => R;
export declare const EnsureSync: z.ZodFunction<z.ZodTuple<[z.ZodAny], z.ZodUnknown>, z.ZodAny>;
export type EnsureAsync<R> = (ctx: R) => Promise<R>;
export declare const EnsureAsync: z.ZodFunction<z.ZodTuple<[z.ZodAny], z.ZodUnknown>, z.ZodPromise<z.ZodAny>>;
export type EnsureCallback<R> = (ctx: R, done: CallbackFunction<R>) => void;
export declare const EnsureCallback: z.ZodFunction<z.ZodTuple<[z.ZodAny, z.ZodEffects<z.ZodFunction<z.ZodTuple<[z.ZodAny, z.ZodAny], z.ZodUnknown>, z.ZodVoid>, (args_0: any, args_1: any, ...args_2: unknown[]) => void, (args_0: any, args_1: any, ...args_2: unknown[]) => void>], z.ZodUnknown>, z.ZodUndefined>;
export declare function isEnsureSync<R>(inp: unknown): inp is EnsureSync<R>;
export declare function isEnsureAsync<R>(inp: unknown): inp is EnsureAsync<R>;
export declare function isEnsureCallback<R>(inp: unknown): inp is EnsureCallback<R>;
export declare function isEnsureFunction<R>(inp: unknown): inp is EnsureFunction<R>;
export type EnsureFunction<R> = EnsureSync<R> | EnsureAsync<R> | EnsureCallback<R>;
export declare const EnsureFunction: z.ZodUnion<[z.ZodFunction<z.ZodTuple<[z.ZodAny], z.ZodUnknown>, z.ZodAny>, z.ZodFunction<z.ZodTuple<[z.ZodAny], z.ZodUnknown>, z.ZodPromise<z.ZodAny>>, z.ZodFunction<z.ZodTuple<[z.ZodAny, z.ZodEffects<z.ZodFunction<z.ZodTuple<[z.ZodAny, z.ZodAny], z.ZodUnknown>, z.ZodVoid>, (args_0: any, args_1: any, ...args_2: unknown[]) => void, (args_0: any, args_1: any, ...args_2: unknown[]) => void>], z.ZodUnknown>, z.ZodUndefined>]>;
//# sourceMappingURL=EnsureFunction.d.ts.map