import { RunPipelineFunction, StageRun } from '../types';
export declare function execute_custom_run<Input, Output>(run: RunPipelineFunction<Input, Output>): StageRun<Input, Output>;
