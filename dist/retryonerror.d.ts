import { Stage } from './stage';
import { AllowedStage, AnyStage, StageRun, RetryOnErrorConfig } from './utils/types/types';
export declare class RetryOnError<R, C extends RetryOnErrorConfig<R>> extends Stage<R, C> implements AnyStage {
    constructor(config?: AllowedStage<R, C>);
    get reportName(): string;
    toString(): string;
    protected backupContext(ctx: unknown): unknown;
    protected restoreContext(ctx: unknown, backup: unknown): unknown;
    compile(rebuild?: boolean): StageRun<R>;
}
//# sourceMappingURL=retryonerror.d.ts.map