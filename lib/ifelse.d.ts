import { Stage } from './stage';
import { AllowedStage, IfElseConfig, StageObject } from './utils/types';
import { StageRun } from './utils/types';
export declare class IfElse<T extends StageObject> extends Stage<T, IfElseConfig<T>> {
    constructor(config?: AllowedStage<T, IfElseConfig<T>>);
    get reportName(): string;
    toString(): string;
    compile(rebuild?: boolean): StageRun<T>;
}
//# sourceMappingURL=ifelse.d.ts.map