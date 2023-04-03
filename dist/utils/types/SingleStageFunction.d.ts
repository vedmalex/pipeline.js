import * as z from 'zod';
import { CallbackFunction } from './CallbackFunction';
export type SingleStage2Function<R> = (ctx: R, callback: CallbackFunction<R>) => void;
export declare const SingleStage2Function: z.ZodFunction<z.ZodTuple<[z.ZodUnknown, z.ZodFunction<z.ZodTuple<[], z.ZodUnknown>, z.ZodUnknown>], z.ZodUnknown>, z.ZodVoid>;
export declare function isSingleStageFunction2<R>(inp?: unknown): inp is SingleStage2Function<R>;
export type SingleStage3Function<R> = (err: unknown, ctx: R, callback: CallbackFunction<R>) => void;
export declare const SingleStage3Function: z.ZodFunction<z.ZodTuple<[z.ZodUnknown, z.ZodUnknown, z.ZodFunction<z.ZodTuple<[], z.ZodUnknown>, z.ZodUnknown>], z.ZodUnknown>, z.ZodVoid>;
export declare function isSingleStage3Function(inp?: unknown): inp is SingleStage3Function<unknown>;
export declare function isSingleStageFunction<R>(inp?: unknown): inp is SingleStageFunction<R>;
export type SingleStageFunction<R> = SingleStage2Function<R> | SingleStage3Function<R>;
export declare const SingleStageFunction: z.ZodUnion<[z.ZodFunction<z.ZodTuple<[z.ZodUnknown, z.ZodFunction<z.ZodTuple<[], z.ZodUnknown>, z.ZodUnknown>], z.ZodUnknown>, z.ZodVoid>, z.ZodFunction<z.ZodTuple<[z.ZodUnknown, z.ZodUnknown, z.ZodFunction<z.ZodTuple<[], z.ZodUnknown>, z.ZodUnknown>], z.ZodUnknown>, z.ZodVoid>]>;
//# sourceMappingURL=SingleStageFunction.d.ts.map