import { ComplexError } from './ErrorList';
import { CallbackFunction, RunPipelineFunction, StageObject } from './types';
import { Possible } from './types';
import { ContextType } from '../context';
export declare function execute_callback<T extends StageObject>(err: Possible<ComplexError>, run: RunPipelineFunction<T>, context: ContextType<T>, _done: CallbackFunction<T>): void;
//# sourceMappingURL=execute_callback.d.ts.map