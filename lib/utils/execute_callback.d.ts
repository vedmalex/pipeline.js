import { CallbackFunction, RunPipelineFunction, StageObject } from './types';
import { Possible } from './types';
export declare function execute_callback<T extends StageObject, R>(err: Possible<Error>, run: RunPipelineFunction<T, R>, context: T, _done: CallbackFunction<R>): void;
//# sourceMappingURL=execute_callback.d.ts.map