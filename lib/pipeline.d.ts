import { Stage } from './stage';
import { AnyStage, StageObject } from './utils/types';
import { AllowedStage, PipelineConfig, RunPipelineFunction, StageConfig, StageRun } from './utils/types';
export declare class Pipeline<T extends StageObject> extends Stage<T, PipelineConfig<T>> {
    constructor(config?: AllowedStage<T, PipelineConfig<T>> | Array<Stage<T, PipelineConfig<T>> | RunPipelineFunction<T>>);
    get reportName(): string;
    addStage<IT extends StageObject>(_stage: StageConfig<IT> | RunPipelineFunction<IT> | AnyStage<IT>): void;
    toString(): string;
    compile(rebuild?: boolean): StageRun<T>;
}
//# sourceMappingURL=pipeline.d.ts.map