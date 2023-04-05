import * as z from 'zod';
export type CallbackFunction<R> = (err?: any, res?: R) => void;
export declare const CallbackFunctionValidator: z.ZodFunction<z.ZodTuple<[z.ZodOptional<z.ZodAny>, z.ZodOptional<z.ZodAny>], z.ZodUnknown>, z.ZodVoid>;
export declare function CallbackFunctionWrap(inp: unknown): (args_0: any, args_1: any, ...args_2: unknown[]) => void;
export declare function isCallbackFunction<R>(inp?: unknown): inp is CallbackFunction<R>;
//# sourceMappingURL=CallbackFunction.d.ts.map