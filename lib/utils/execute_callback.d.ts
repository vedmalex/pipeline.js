import { CallbackFunction, RunPipelineFunction, StageObject } from './types';
import { Possible } from './types';
export declare function execute_callback<T extends StageObject>(err: Possible<Error>, run: RunPipelineFunction<T>, context: T, _done: CallbackFunction<T>): void;
//# sourceMappingURL=execute_callback.d.ts.map