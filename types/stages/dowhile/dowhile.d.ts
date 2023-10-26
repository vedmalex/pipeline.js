import { AnyStage, SingleStageFunction, Stage, StageRun } from '../../stage';
import { DoWhileConfig } from './DoWhileConfig';
export declare class DoWhile<Input, Output, T, Config extends DoWhileConfig<Input, Output, T> = DoWhileConfig<Input, Output, T>> extends Stage<Input, Output, Config> {
    constructor();
    constructor(stage: AnyStage<Input, Output>);
    constructor(config: Config);
    constructor(stageFn: SingleStageFunction<Input, Output>);
    get reportName(): string;
    toString(): string;
    protected reachEnd(err: unknown, ctx: Input, iter: number): boolean;
    protected split(ctx: unknown, iter: number): any;
    compile(rebuild?: boolean): StageRun<Input, Output>;
}
