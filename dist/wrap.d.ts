import { Stage } from './stage';
import { AllowedStage, WrapConfig, StageRun } from './utils/types/types';
export declare class Wrap<R, T, C extends WrapConfig<R, T> = WrapConfig<R, T>> extends Stage<R, C> {
    constructor(config?: AllowedStage<R, C>);
    get reportName(): string;
    toString(): string;
    compile(rebuild?: boolean): StageRun<R>;
    protected prepare(ctx: unknown): unknown;
    protected finalize(ctx: unknown, retCtx: unknown): unknown;
}
//# sourceMappingURL=wrap.d.ts.map