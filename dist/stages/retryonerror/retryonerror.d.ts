import { Stage, AnyStage, AllowedStage, StageRun, StageObject, ContextType } from '../../stage';
import { RetryOnErrorConfig } from './RetryOnErrorConfig';
export declare class RetryOnError<R extends StageObject, T extends StageObject, C extends RetryOnErrorConfig<R, T> = RetryOnErrorConfig<R, T>> extends Stage<R, C> implements AnyStage<R> {
    constructor(config?: AllowedStage<R, C>);
    get reportName(): string;
    toString(): string;
    protected backupContext(ctx: ContextType<R>): ContextType<T>;
    protected restoreContext(ctx: ContextType<R>, backup: ContextType<T>): ContextType<R>;
    compile(rebuild?: boolean): StageRun<R>;
}
//# sourceMappingURL=retryonerror.d.ts.map