import { AnyStage, CallbackFunction, Possible, RunPipelineFunction, StageObject } from './types';
export declare function run_or_execute<T extends StageObject, R extends StageObject, RC, RRET>(stage: AnyStage<T, R> | RunPipelineFunction<T, R>, err: Possible<Error>, context: Possible<RC>, _done: CallbackFunction<RRET>): void;
//# sourceMappingURL=run_or_execute.d.ts.map