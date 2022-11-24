import { Stage } from '../stage';
import { AllowedStage, AnyStage, RunPipelineFunction, StageObject } from './types';
import { StageConfig, StageRun } from './types';
export interface TemplateConfig<T extends StageObject> extends StageConfig<T> {
    stage: AnyStage<T> | RunPipelineFunction<T>;
}
export declare function getTemplateConfig<T extends StageObject, C extends TemplateConfig<T>>(config: AllowedStage<T, C>): C;
export declare class Template<T extends StageObject, C extends TemplateConfig<T>> extends Stage<T, C> {
    constructor(config?: AllowedStage<T, C>);
    get reportName(): string;
    toString(): string;
    compile(rebuild?: boolean): StageRun<T>;
}
//# sourceMappingURL=template.d.ts.map