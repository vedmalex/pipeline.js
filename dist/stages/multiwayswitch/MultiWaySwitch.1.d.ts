import { Stage, StageRun } from '../../stage';
import { AllowedMWS } from './AllowedMWS';
import { MultWaySwitchConfig } from './MultWaySwitchConfig';
import { MultiWaySwitchCase } from './MultiWaySwitchCase';
export declare class MultiWaySwitch<R, T, C extends MultWaySwitchConfig<R, T> = MultWaySwitchConfig<R, T>> extends Stage<R, C> {
    constructor(config?: AllowedMWS<R, T, C>);
    get reportName(): string;
    toString(): string;
    protected combine(ctx: unknown, retCtx: unknown): unknown;
    protected combineCase(item: MultiWaySwitchCase<R, T>, ctx: unknown, retCtx: unknown): unknown;
    protected split(ctx: unknown): unknown;
    protected splitCase(item: unknown, ctx: unknown): any;
    compile(rebuild?: boolean): StageRun<R>;
}
//# sourceMappingURL=MultiWaySwitch.1.d.ts.map