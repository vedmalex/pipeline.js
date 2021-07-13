import { Stage } from './stage';
import { PipelineConfig, StageRun, StageConfig, RunPipelineFunction, AllowedStage } from './utils/types';
export declare class Pipeline<T = any, C extends PipelineConfig<T, R> = any, R = T> extends Stage<T, C, R> {
    constructor(config?: AllowedStage<T, C, R> | Array<Stage | RunPipelineFunction<any, any>>);
    get reportName(): string;
    addStage(_stage: StageConfig<T, R> | RunPipelineFunction<any, any> | Stage): void;
    toString(): string;
    compile(rebuild?: boolean): StageRun<T, R>;
}
//# sourceMappingURL=pipeline.d.ts.map