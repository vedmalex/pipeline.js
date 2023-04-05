import * as z from 'zod';
import { AnyStage } from './AnyStage';
export type Precompile<R> = (this: AnyStage<R>) => void;
export declare const PrecompileValidator: z.ZodFunction<z.ZodTuple<[], z.ZodUnknown>, z.ZodVoid>;
export declare function isPrecompile<R>(inp?: unknown): inp is Precompile<R>;
//# sourceMappingURL=Precompile.d.ts.map