import { Stage } from '../stage';
import { AllowedStage, AnyStage, RunPipelineFunction } from './types';
import { StageConfig, StageRun } from './types';
export interface TemplateConfig<T, R> extends StageConfig<T, R> {
    stage: AnyStage<T, R> | RunPipelineFunction<T, R>;
}
export declare function getTemplateConfig<T, C extends TemplateConfig<T, R>, R>(config: AllowedStage<T, C, R>): C;
export declare class Template<T, C extends TemplateConfig<T, R>, R> extends Stage<T, C, R> {
    constructor(config?: AllowedStage<T, C, R>);
    get reportName(): string;
    toString(): string;
    compile(rebuild?: boolean): StageRun<T, R>;
}
//# sourceMappingURL=template.d.ts.map