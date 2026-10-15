import { RunPipelineFunction, StageObject, StageRun } from './types';
export declare function execute_custom_run<T extends StageObject>(run: RunPipelineFunction<T>): StageRun<T>;
