import * as z from 'zod';
export type CallbackFunction<R> = (err?: any, res?: R) => void;
export declare const CallbackFunction: z.ZodEffects<z.ZodFunction<z.ZodTuple<[z.ZodAny, z.ZodAny], z.ZodUnknown>, z.ZodVoid>, (args_0: any, args_1: any, ...args_2: unknown[]) => void, (args_0: any, args_1: any, ...args_2: unknown[]) => void>;
export declare function isCallbackFunction<R>(inp?: unknown): inp is CallbackFunction<R>;
//# sourceMappingURL=CallbackFunction.d.ts.map