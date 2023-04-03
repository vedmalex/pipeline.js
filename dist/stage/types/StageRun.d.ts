import * as z from 'zod';
import { CallbackFunction } from './CallbackFunction';
export type StageRun<R> = (err: unknown, context: R, callback: CallbackFunction<R>) => void;
export declare const StageRun: z.ZodFunction<z.ZodTuple<[z.ZodUnknown, z.ZodUnknown, z.ZodFunction<z.ZodTuple<[], z.ZodUnknown>, z.ZodUnknown>], z.ZodUnknown>, z.ZodVoid>;
//# sourceMappingURL=StageRun.d.ts.map