import * as z from 'zod';
import { CallbackFunction } from './CallbackFunction';
export type Rescue1Sync<R> = (ctx: R) => any;
export declare const Rescue1Sync: z.ZodFunction<z.ZodTuple<[z.ZodUnknown], z.ZodUnknown>, z.ZodAny>;
export type Rescue1ASync<R> = (ctx: R) => Promise<void>;
export declare const Rescue1ASync: z.ZodFunction<z.ZodTuple<[z.ZodUnknown], z.ZodUnknown>, z.ZodPromise<z.ZodVoid>>;
export type Rescue2ASync<R> = (err: unknown, ctx: R) => Promise<void>;
export declare const Rescue2ASync: z.ZodFunction<z.ZodTuple<[z.ZodUnknown, z.ZodUnknown], z.ZodUnknown>, z.ZodPromise<z.ZodVoid>>;
export type Rescue2Sync<R> = (err: unknown, ctx: R) => R;
export declare const Rescue2Sync: z.ZodFunction<z.ZodTuple<[z.ZodUnknown, z.ZodUnknown], z.ZodUnknown>, z.ZodUnknown>;
export type Rescue3Callback<R> = (err: unknown, ctx: R, done: CallbackFunction<R>) => void;
export declare const Rescue3Callback: z.ZodFunction<z.ZodTuple<[z.ZodUnknown, z.ZodUnknown, z.ZodFunction<z.ZodTuple<[], z.ZodUnknown>, z.ZodUnknown>], z.ZodUnknown>, z.ZodVoid>;
export declare function isRescue1Sync<R>(inp: unknown): inp is Rescue1Sync<R>;
export declare function isRescue1ASync<R>(inp: unknown): inp is Rescue1ASync<R>;
export declare function isRescue2ASync<R>(inp: unknown): inp is Rescue2ASync<R>;
export declare function isRescue3Callback<R>(inp: unknown): inp is Rescue3Callback<R>;
export declare function isRescue2Sync<R>(inp: unknown): inp is Rescue2Sync<R>;
export declare function isRescue<R>(inp: unknown): inp is Rescue<R>;
export type Rescue<R> = Rescue1Sync<R> | Rescue1ASync<R> | Rescue2ASync<R> | Rescue2Sync<R> | Rescue3Callback<R>;
export declare const Rescue: z.ZodUnion<[z.ZodFunction<z.ZodTuple<[z.ZodUnknown], z.ZodUnknown>, z.ZodAny>, z.ZodFunction<z.ZodTuple<[z.ZodUnknown], z.ZodUnknown>, z.ZodPromise<z.ZodVoid>>, z.ZodFunction<z.ZodTuple<[z.ZodUnknown, z.ZodUnknown], z.ZodUnknown>, z.ZodPromise<z.ZodVoid>>, z.ZodFunction<z.ZodTuple<[z.ZodUnknown, z.ZodUnknown], z.ZodUnknown>, z.ZodUnknown>, z.ZodFunction<z.ZodTuple<[z.ZodUnknown, z.ZodUnknown, z.ZodFunction<z.ZodTuple<[], z.ZodUnknown>, z.ZodUnknown>], z.ZodUnknown>, z.ZodVoid>]>;
//# sourceMappingURL=Rescue.d.ts.map