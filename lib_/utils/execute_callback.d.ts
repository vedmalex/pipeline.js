import { CallbackFunction, RunPipelineFunction } from './types';
export declare function execute_callback<T, R>(err: Error | undefined, run: RunPipelineFunction<T, R>, context: T, done: CallbackFunction<T | R>): void;
//# sourceMappingURL=execute_callback.d.ts.map