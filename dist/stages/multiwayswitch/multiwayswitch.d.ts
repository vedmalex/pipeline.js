import { ContextType, Stage, StageObject, StageRun } from '../../stage';
import { AllowedMWS } from './AllowedMWS';
import { MultWaySwitchConfig } from './MultWaySwitchConfig';
import { MultiWaySwitchCase } from './MultiWaySwitchCase';
export declare class MultiWaySwitch<R extends StageObject, T extends StageObject, C extends MultWaySwitchConfig<R, T> = MultWaySwitchConfig<R, T>> extends Stage<R, C> {
    constructor(config?: AllowedMWS<R, T, C>);
    get reportName(): string;
    toString(): string;
    protected combine(ctx: ContextType<R>, retCtx: ContextType<T>): ContextType<R>;
    protected combineCase(item: MultiWaySwitchCase<R, T>, ctx: ContextType<R>, retCtx: ContextType<T>): ContextType<R>;
    protected split(ctx: unknown): unknown;
    protected splitCase(item: unknown, ctx: unknown): any;
    compile(rebuild?: boolean): StageRun<R>;
}
//# sourceMappingURL=MultiWaySwitch.d.ts.map