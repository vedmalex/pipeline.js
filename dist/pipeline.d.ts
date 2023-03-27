import { Stage } from './stage';
import { AnyStage } from './utils/types/types';
import { AllowedStage, PipelineConfig, RunPipelineFunction, StageRun } from './utils/types/types';
export declare class Pipeline<R, C extends PipelineConfig<R> = PipelineConfig<R>> extends Stage<R, C> {
    constructor(config?: PipelineConfig<R> | AllowedStage<R, C> | Array<AnyStage<R> | RunPipelineFunction<R>>);
    get reportName(): string;
    addStage(_stage: unknown): void;
    toString(): string;
    compile(rebuild?: boolean): StageRun<R>;
}
//# sourceMappingURL=pipeline.d.ts.map