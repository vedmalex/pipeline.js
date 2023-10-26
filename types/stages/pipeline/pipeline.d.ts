import { AllowedStage, AnyStage, RunPipelineFunction, Stage, StageRun } from '../../stage';
import { PipelineConfig } from './PipelineConfig';
export declare class Pipeline<Input, Output, Config extends PipelineConfig<Input, Output> = PipelineConfig<Input, Output>> extends Stage<Input, Output, Config> {
    constructor(config?: PipelineConfig<Input, Output> | AllowedStage<Input, Output, Config> | Array<AnyStage<Input, Output> | RunPipelineFunction<Input, Output>>);
    get reportName(): string;
    toString(): string;
    addStage(_stage: unknown): void;
    compile(rebuild?: boolean): StageRun<Input, Output>;
}
