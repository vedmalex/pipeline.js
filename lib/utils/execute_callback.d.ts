import { CallbackFunction, RunPipelineFunction } from './types';
import { Possible } from './types';
export declare function execute_callback<T, R>(err: Possible<Error>, run: RunPipelineFunction<T, R>, context: T, _done: CallbackFunction<R>): void;
//# sourceMappingURL=execute_callback.d.ts.map