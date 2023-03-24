import { Stage } from './stage';
import { AllowedStage, WrapConfig, StageRun } from './utils/types/types';
export declare class Wrap<R, C extends WrapConfig<R>> extends Stage<R, C> {
    constructor(config?: AllowedStage<R, C>);
    get reportName(): string;
    toString(): string;
    compile(rebuild?: boolean): StageRun<R>;
    protected prepare(ctx: unknown): unknown;
    protected finalize(ctx: unknown, retCtx: unknown): unknown;
}
//# sourceMappingURL=wrap.d.ts.map