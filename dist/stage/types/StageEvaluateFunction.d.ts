import * as z from 'zod';
export type StageEvaluateFunction<R> = (ctx: R) => boolean;
export declare const StageEvaluateFunctionValidator: z.ZodType<StageEvaluateFunction<unknown>, z.ZodTypeDef, StageEvaluateFunction<unknown>>;
export declare function isEvaluateFunction<R>(arg: any): arg is StageEvaluateFunction<R>;
//# sourceMappingURL=StageEvaluateFunction.d.ts.map