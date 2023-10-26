import { AllowedStage, Stage, StageRun } from '../../stage';
import { WrapConfig } from './WrapConfig';
export declare class Wrap<Input, Output, T, Config extends WrapConfig<Input, Output, T> = WrapConfig<Input, Output, T>> extends Stage<Input, Output, Config> {
    constructor(config?: AllowedStage<Input, Output, Config>);
    get reportName(): string;
    toString(): string;
    compile(rebuild?: boolean): StageRun<Input, Output>;
    protected prepare(ctx: Input): T;
    protected finalize(ctx: Input, retCtx: unknown): Output | void;
}
