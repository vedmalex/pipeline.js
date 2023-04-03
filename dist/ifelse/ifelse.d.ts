import { Stage } from './stage';
import { AllowedStage, IfElseConfig } from './utils/types';
import { StageRun } from './utils/types';
export declare class IfElse<R, C extends IfElseConfig<R> = IfElseConfig<R>> extends Stage<R, C> {
    constructor(config?: AllowedStage<R, C>);
    get reportName(): string;
    toString(): string;
    compile(rebuild?: boolean): StageRun<R>;
}
//# sourceMappingURL=ifelse.d.ts.map