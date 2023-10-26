import { AllowedStage, AnyStage, Stage, StageRun } from '../../stage';
import { RetryOnErrorConfig } from './RetryOnErrorConfig';
export declare class RetryOnError<Input, Output, T, Config extends RetryOnErrorConfig<Input, Output, T> = RetryOnErrorConfig<Input, Output, T>> extends Stage<Input, Output, Config> implements AnyStage<Input, Output> {
    constructor(config?: AllowedStage<Input, Output, Config>);
    get reportName(): string;
    toString(): string;
    protected backupContext(ctx: Input): T;
    protected restoreContext(ctx: Input, backup: T): Input;
    compile(rebuild?: boolean): StageRun<Input, Output>;
}
