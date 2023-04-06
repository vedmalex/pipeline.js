import { AllowedStage, AnyStage, RunPipelineFunction, Stage, StageObject, StageRun } from '../../stage';
import { PipelineConfig } from './PipelineConfig';
export declare class Pipeline<R extends StageObject, C extends PipelineConfig<R> = PipelineConfig<R>> extends Stage<R, C> {
    constructor(config?: PipelineConfig<R> | AllowedStage<R, C> | Array<AnyStage<R> | RunPipelineFunction<R>>);
    get reportName(): string;
    toString(): string;
    addStage(_stage: unknown): void;
    compile(rebuild?: boolean): StageRun<R>;
}
//# sourceMappingURL=Pipeline.d.ts.map