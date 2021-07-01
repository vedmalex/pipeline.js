import { Stage } from '../stage';
import { IStage, SingleStageFunction, StageConfig, StageRun } from './types';
export interface TemplateConfig<T, R> extends StageConfig<T, R> {
}
export declare class Template<T, C extends TemplateConfig<T, R>, R> extends Stage<T, C, R> {
    stages: Array<IStage<any, any, any>>;
    constructor(config?: string | C | SingleStageFunction<T>);
    get reportName(): string;
    toString(): string;
    compile(rebuild?: boolean): StageRun<T, R>;
}
//# sourceMappingURL=wrap.d.ts.map