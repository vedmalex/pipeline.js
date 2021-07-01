import { Stage } from '../stage';
import { AllowedStage } from './types';
import { StageConfig, StageRun } from './types';
export interface TemplateConfig<T, R> extends StageConfig<T, R> {
}
export declare class Template<T, C extends TemplateConfig<T, R>, R> extends Stage<T, C, R> {
    constructor(config?: AllowedStage<T, C, R>);
    get reportName(): string;
    toString(): string;
    compile(rebuild?: boolean): StageRun<T, R>;
}
//# sourceMappingURL=template.d.ts.map