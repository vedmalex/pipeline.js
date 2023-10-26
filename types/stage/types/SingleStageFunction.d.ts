import { CallbackFunction, LegacyCallback } from './CallbackFunction';
export type SingleStage2Function<Input, Output> = (ctx: Input, callback: CallbackFunction<Input, Output>) => void;
export type SingleStage2FunctionLegacy<Input, Output> = (ctx: Input, callback: LegacyCallback<Output>) => void;
export declare function isSingleStageFunction2<Input, Output>(inp?: unknown): inp is SingleStage2Function<Input, Output>;
export type SingleStage3Function<Input, Output> = (err: unknown, ctx: Input, callback: CallbackFunction<Input, Output>) => void;
export type SingleStage3FunctionLegacy<Input, Output> = (err: unknown, ctx: Input, callback: LegacyCallback<Output>) => void;
export declare function isSingleStage3Function<Input, Output>(inp?: unknown): inp is SingleStage3Function<Input, Output>;
export declare function isSingleStageFunction<Input, Output>(inp?: unknown): inp is SingleStageFunction<Input, Output>;
export type SingleStageFunction<Input, Output> = SingleStage2Function<Input, Output> | SingleStage3Function<Input, Output>;
