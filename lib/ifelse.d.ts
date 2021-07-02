import { Stage } from './stage';
import { AllowedStage, IfElseConfig } from './utils/types';
import { StageRun } from './utils/types';
export declare class IfElse<T, C extends IfElseConfig<T, R>, R> extends Stage<T, C, R> {
    constructor(config?: AllowedStage<T, C, R>);
    get reportName(): string;
    toString(): string;
    compile(rebuild?: boolean): StageRun<T, R>;
}
//# sourceMappingURL=ifelse.d.ts.map