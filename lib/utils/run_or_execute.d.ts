import { AnyStage, CallbackFunction, RunPipelineFunction, Possible } from './types';
export declare function run_or_execute<T, R, RC, RRET>(stage: AnyStage<T, R> | RunPipelineFunction<T, R>, err: Possible<Error>, context: Possible<RC>, _done: CallbackFunction<RRET>): void;
//# sourceMappingURL=run_or_execute.d.ts.map