import { Stage } from '../stage';
import { AllowedStage, AnyStage, RunPipelineFunction, StageObject } from './types';
import { StageConfig, StageRun } from './types';
export interface TemplateConfig<T extends StageObject, R extends StageObject> extends StageConfig<T, R> {
    stage: AnyStage<T, R> | RunPipelineFunction<T, R>;
}
export declare function getTemplateConfig<T extends StageObject, C extends TemplateConfig<T, R>, R extends StageObject>(config: AllowedStage<T, C, R>): C;
export declare class Template<T extends StageObject, C extends TemplateConfig<T, R>, R extends StageObject> extends Stage<T, C, R> {
    constructor(config?: AllowedStage<T, C, R>);
    get reportName(): string;
    toString(): string;
    compile(rebuild?: boolean): StageRun<T, R>;
}
//# sourceMappingURL=template.d.ts.map