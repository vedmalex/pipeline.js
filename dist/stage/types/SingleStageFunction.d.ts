import { ContextType } from '../Context';
import { CallbackFunction } from './CallbackFunction';
import { StageObject } from './StageObject';
export type SingleStage2Function<R extends StageObject> = (ctx: ContextType<R>, callback: CallbackFunction<ContextType<R>>) => void;
export declare function isSingleStageFunction2<R extends StageObject>(inp?: unknown): inp is SingleStage2Function<R>;
export type SingleStage3Function<R extends StageObject> = (err: unknown, ctx: ContextType<R>, callback: CallbackFunction<ContextType<R>>) => void;
export declare function isSingleStage3Function<R extends StageObject>(inp?: unknown): inp is SingleStage3Function<R>;
export declare function isSingleStageFunction<R extends StageObject>(inp?: unknown): inp is SingleStageFunction<R>;
export type SingleStageFunction<R extends StageObject> = SingleStage2Function<R> | SingleStage3Function<R>;
//# sourceMappingURL=SingleStageFunction.d.ts.map