import { Stage } from './stage';
import { IStage, PipelineConfig, StageRun, StageConfig, RunPipelineFunction } from './utils/types';
export declare class Pipeline<T, C extends PipelineConfig<T, R>, R> extends Stage<T, C, R> {
    stages: Array<IStage<any, any, any> | RunPipelineFunction<any, any>>;
    constructor(config?: string | PipelineConfig<T, R>);
    get reportName(): string;
    addStage(_stage: StageConfig<T, R> | RunPipelineFunction<any, any> | IStage<any, any, any>): void;
    toString(): string;
    compile(rebuild?: boolean): StageRun<T, R>;
}
//# sourceMappingURL=pipeline.d.ts.map