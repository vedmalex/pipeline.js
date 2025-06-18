import { RunPipelineFunction, StageObject } from './types';
export declare function can_fix_error<T extends StageObject>({ run, }: {
    run: RunPipelineFunction<T>;
}): boolean;
