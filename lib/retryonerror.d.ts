import { Stage } from './stage';
import { AllowedStage, RunPipelineFunction } from './utils/types';
import { StageConfig, StageRun, Func3 } from './utils/types';
export interface RetryOnErrorConfig<T, R> extends StageConfig<T, R> {
    stage: Stage<T, any, R> | RunPipelineFunction<T, R>;
    retry: number | Func3<boolean, Error | undefined, T | R, number>;
    backup: Function;
    restore: Function;
}
export declare function getRetryOnErrorConfig<T, C extends RetryOnErrorConfig<T, R>, R>(config: AllowedStage<T, C, R>): C;
export declare class RetryOnError<T = any, C extends RetryOnErrorConfig<T, R> = any, R = T> extends Stage<T, C, R> {
    constructor(config?: AllowedStage<T, C, R>);
    get reportName(): string;
    toString(): string;
    backupContext(ctx: T | R): T | R;
    restoreContext(ctx: T | R, backup: T | R): T | R;
    compile(rebuild?: boolean): StageRun<T, R>;
}
//# sourceMappingURL=retryonerror.d.ts.map