export type StageEvaluateFunction<Input> = (ctx: Input) => boolean;
export declare function isEvaluateFunction<Input>(inp: any): inp is StageEvaluateFunction<Input>;
