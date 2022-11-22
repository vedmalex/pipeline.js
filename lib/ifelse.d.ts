import { Stage } from './stage';
import { AllowedStage, IfElseConfig, StageObject } from './utils/types';
import { StageRun } from './utils/types';
export declare class IfElse<T extends StageObject, R extends StageObject = T> extends Stage<T, IfElseConfig<T, R>, R> {
    constructor(config?: AllowedStage<T, IfElseConfig<T, R>, R>);
    get reportName(): string;
    toString(): string;
    compile(rebuild?: boolean): StageRun<T, R>;
}
//# sourceMappingURL=ifelse.d.ts.map