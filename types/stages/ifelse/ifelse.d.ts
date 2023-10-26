import { AllowedStage, Stage, StageRun } from '../../stage';
import { IfElseConfig } from './IfElseConfig';
export declare class IfElse<Input, Output, Config extends IfElseConfig<Input, Output> = IfElseConfig<Input, Output>> extends Stage<Input, Output, Config> {
    constructor(config?: AllowedStage<Input, Output, Config>);
    get reportName(): string;
    toString(): string;
    compile(rebuild?: boolean): StageRun<Input, Output>;
}
