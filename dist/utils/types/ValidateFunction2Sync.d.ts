import { CallbackFunction } from './CallbackFunction';
import * as z from 'zod';
export type ValidateFunction2Sync<R> = (ctx: R, callback: CallbackFunction<boolean>) => void;
export declare const ValidateFunction2Sync: z.ZodFunction<z.ZodTuple<[z.ZodAny, z.ZodFunction<z.ZodTuple<[z.ZodAny, z.ZodAny], z.ZodUnknown>, z.ZodVoid>], z.ZodUnknown>, z.ZodVoid>;
export declare function isValidateFunction2Sync<R>(inp: unknown): inp is ValidateFunction2Sync<R>;
//# sourceMappingURL=ValidateFunction2Sync.d.ts.map