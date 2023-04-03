import { Stage } from './stage';
import { AnyStage, RunPipelineFunction } from './utils/types';
import { AllowedStage, PipelineConfig, StageRun } from './utils/types';
export declare class Pipeline<R, C extends PipelineConfig<R> = PipelineConfig<R>> extends Stage<R, C> {
    constructor(config?: PipelineConfig<R> | AllowedStage<R, C> | Array<AnyStage<R> | RunPipelineFunction<R>>);
    get reportName(): string;
    toString(): string;
    addStage(_stage: unknown): void;
    compile(rebuild?: boolean): StageRun<R>;
}
//# sourceMappingURL=pipeline.d.ts.map