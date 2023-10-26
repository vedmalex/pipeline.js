import { AllowedStage, Stage, StageRun } from '../../stage';
import { ParallelConfig } from './ParallelConfig';
export declare class Sequential<Input, Output, T, Config extends ParallelConfig<Input, Output, T> = ParallelConfig<Input, Output, T>> extends Stage<Input, Output, Config> {
    constructor(config?: AllowedStage<Input, Output, Config>);
    get reportName(): string;
    toString(): string;
    get name(): string;
    compile(rebuild?: boolean): StageRun<Input, Output>;
    protected split(ctx: Input): Array<T>;
    protected combine(ctx: Input, children: Array<T>): Output;
}
