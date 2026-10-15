import { CleanError } from './ErrorList';
import { CallbackFunction, RunPipelineFunction, StageObject } from './types';
import { Possible } from './types';
export declare function execute_callback<T extends StageObject>(err: Possible<CleanError>, run: RunPipelineFunction<T>, context: T, _done: CallbackFunction<T>): void;
