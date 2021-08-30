import { Stage } from './stage';
import { AnyStage } from './utils/types';
import { PipelineConfig, StageRun, StageConfig, RunPipelineFunction, AllowedStage } from './utils/types';
export declare class Pipeline<T, R = T> extends Stage<T, PipelineConfig<T, R>, R> {
    constructor(config?: AllowedStage<T, PipelineConfig<T, R>, R> | Array<Stage<T, PipelineConfig<T, R>, R> | RunPipelineFunction<T, R>>);
    get reportName(): string;
    addStage<IT, IR>(_stage: StageConfig<IT, IR> | RunPipelineFunction<IT, IR> | AnyStage<IT, IR>): void;
    toString(): string;
    compile(rebuild?: boolean): StageRun<T, R>;
}
//# sourceMappingURL=pipeline.d.ts.map