import { Stage, AnyStage, AllowedStage, StageRun } from '../../stage';
import { RetryOnErrorConfig } from './RetryOnErrorConfig';
export declare class RetryOnError<R, T, C extends RetryOnErrorConfig<R, T> = RetryOnErrorConfig<R, T>> extends Stage<R, C> implements AnyStage<R> {
    constructor(config?: AllowedStage<R, C>);
    get reportName(): string;
    toString(): string;
    protected backupContext(ctx: unknown): unknown;
    protected restoreContext(ctx: unknown, backup: unknown): unknown;
    compile(rebuild?: boolean): StageRun<R>;
}
//# sourceMappingURL=retryonerror.d.ts.map