import { AnyStage, CallbackFunction, Possible, RunPipelineFunction, StageObject } from './types';
export declare function run_or_execute<T extends StageObject>(stage: AnyStage<T> | RunPipelineFunction<T>, err: Possible<Error>, context: T, _done: CallbackFunction<T>): void;
//# sourceMappingURL=run_or_execute.d.ts.map