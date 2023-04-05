import { StageRun } from './StageRun';
import * as z from 'zod';
export type CompileFunction<R> = (rebuild?: boolean) => StageRun<R>;
export declare const CompileFunction: z.ZodFunction<z.ZodTuple<[z.ZodOptional<z.ZodBoolean>], z.ZodUnknown>, z.ZodFunction<z.ZodTuple<[], z.ZodUnknown>, z.ZodUnknown>>;
export declare function isCompileFunction<R>(inp?: unknown): inp is CompileFunction<R>;
//# sourceMappingURL=CompileFunction.d.ts.map