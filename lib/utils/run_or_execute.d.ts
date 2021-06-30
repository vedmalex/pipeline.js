import { IStage, CallbackFunction, RunPipelineFunction } from './types';
export declare function run_or_execute<T, C, R>(stage: IStage<T, C, R> | RunPipelineFunction<T, R>, err: Error | undefined, context: T | R, _done: CallbackFunction<T | R>): void;
//# sourceMappingURL=run_or_execute.d.ts.map