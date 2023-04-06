import { AllowedStage, Stage, StageObject, StageRun } from '../../stage';
import { IfElseConfig } from './IfElseConfig';
export declare class IfElse<R extends StageObject, C extends IfElseConfig<R> = IfElseConfig<R>> extends Stage<R, C> {
    constructor(config?: AllowedStage<R, C>);
    get reportName(): string;
    toString(): string;
    compile(rebuild?: boolean): StageRun<R>;
}
//# sourceMappingURL=IfElse.d.ts.map