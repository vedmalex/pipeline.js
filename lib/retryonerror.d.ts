import { Stage } from './stage';
import { AllowedStage, RunPipelineFunction, AnyStage, Possible } from './utils/types';
import { StageConfig, StageRun, Func3 } from './utils/types';
export interface RetryOnErrorConfig<T, R> extends StageConfig<T, R> {
    stage: AnyStage<T, R> | RunPipelineFunction<T, R>;
    retry: number | Func3<boolean, Possible<Error>, Possible<T>, number>;
    backup?: (ctx: Possible<T>) => Possible<T>;
    restore?: (ctx: Possible<T>, backup: Possible<T>) => Possible<T>;
}
export declare function getRetryOnErrorConfig<T, C extends RetryOnErrorConfig<T, R>, R>(config: AllowedStage<T, C, R>): C;
export declare class RetryOnError<T, R = T> extends Stage<T, RetryOnErrorConfig<T, R>, R> {
    constructor(config?: AllowedStage<T, RetryOnErrorConfig<T, R>, R>);
    get reportName(): string;
    toString(): string;
    backupContext(ctx: Possible<T>): Possible<T>;
    restoreContext(ctx: Possible<T>, backup: Possible<T>): Possible<T>;
    compile(rebuild?: boolean): StageRun<T, R>;
}
//# sourceMappingURL=retryonerror.d.ts.map