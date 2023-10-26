import { AllowedStage, Stage, StageConfig } from '../../stage';
export declare class Empty<Input, Output, Config extends StageConfig<Input, Output> = StageConfig<Input, Output>> extends Stage<Input, Output, Config> {
    constructor(config: AllowedStage<Input, Output, Config>);
    toString(): string;
}
