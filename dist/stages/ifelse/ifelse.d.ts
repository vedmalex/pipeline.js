import { AllowedStage, Stage, StageRun } from '../../stage';
import { IfElseConfig } from './IfElseConfig';
export declare class IfElse<R, C extends IfElseConfig<R> = IfElseConfig<R>> extends Stage<R, C> {
    constructor(config?: AllowedStage<R, C>);
    get reportName(): string;
    toString(): string;
    compile(rebuild?: boolean): StageRun<R>;
}
//# sourceMappingURL=ifelse.d.ts.map