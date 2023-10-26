import { Stage, StageRun } from '../../stage';
import { AllowedMWS } from './AllowedMWS';
import { MultiWaySwitchCase } from './MultiWaySwitchCase';
import { MultWaySwitchConfig } from './MultWaySwitchConfig';
export declare class MultiWaySwitch<Input, Output, T, Config extends MultWaySwitchConfig<Input, Output, T> = MultWaySwitchConfig<Input, Output, T>> extends Stage<Input, Output, Config> {
    constructor(config?: AllowedMWS<Input, Output, T, Config>);
    get reportName(): string;
    toString(): string;
    protected combine(ctx: Input, retCtx: T): Output;
    protected combineCase(item: MultiWaySwitchCase<Input, Output, T>, ctx: Input, retCtx: T): Output;
    protected split(ctx: Input): unknown;
    protected splitCase(item: unknown, ctx: Input): any;
    compile(rebuild?: boolean): StageRun<Input, Output>;
}
