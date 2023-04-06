import { StageObject } from './StageObject';
export type StageEvaluateFunction<R extends StageObject> = (ctx: R) => boolean;
export declare function isEvaluateFunction<R extends StageObject>(inp: any): inp is StageEvaluateFunction<R>;
//# sourceMappingURL=StageEvaluateFunction.d.ts.map