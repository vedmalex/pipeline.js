import { AllowedStage, Stage, StageRun } from '../../stage';
import { TimeoutConfig } from './TimeoutConfig';
export declare class Timeout<Input, Output, Config extends TimeoutConfig<Input, Output> = TimeoutConfig<Input, Output>> extends Stage<Input, Output, Config> {
    constructor(config?: AllowedStage<Input, Output, Config>);
    get reportName(): string;
    toString(): string;
    compile(rebuild?: boolean): StageRun<Input, Output>;
}
