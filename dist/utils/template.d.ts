import { Stage } from '../stage';
import { AllowedStage, RunPipelineFunction, AnyStage, StageRun } from './types/types';
import { StageConfig } from './types/types';
export interface TemplateConfig<R> extends StageConfig<R> {
    stage: AnyStage<R> | RunPipelineFunction<R>;
}
export declare function getTemplateConfig<R, C extends TemplateConfig<R>>(config: AllowedStage<R, C>): C;
export declare class Template<R, C extends TemplateConfig<R>> extends Stage<R, C> {
    constructor(config?: AllowedStage<R, C>);
    get reportName(): string;
    toString(): string;
    compile(rebuild?: boolean): StageRun<R>;
}
//# sourceMappingURL=template.d.ts.map