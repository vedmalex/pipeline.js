import { Stage } from './stage';
import { AnyStage, StageObject } from './utils/types';
import { AllowedStage, PipelineConfig, RunPipelineFunction, StageConfig, StageRun } from './utils/types';
export declare class Pipeline<T extends StageObject, R extends StageObject = T> extends Stage<T, PipelineConfig<T, R>, R> {
    constructor(config?: AllowedStage<T, PipelineConfig<T, R>, R> | Array<Stage<T, PipelineConfig<T, R>, R> | RunPipelineFunction<T, R>>);
    get reportName(): string;
    addStage<IT extends StageObject, IR extends StageObject>(_stage: StageConfig<IT, IR> | RunPipelineFunction<IT, IR> | AnyStage<IT, IR>): void;
    toString(): string;
    compile(rebuild?: boolean): StageRun<T, R>;
}
//# sourceMappingURL=pipeline.d.ts.map