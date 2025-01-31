import { Stage } from './stage';
import { ComplexError } from './utils/ErrorList';
import { AllowedStage, AnyStage, Possible, RunPipelineFunction, StageObject } from './utils/types';
import { Func3, StageConfig, StageRun } from './utils/types';
export interface RetryOnErrorConfig<T extends StageObject> extends StageConfig<T> {
    stage: AnyStage<T> | RunPipelineFunction<T>;
    retry: number | Func3<boolean, Possible<ComplexError>, T, number>;
    backup?: (ctx: T) => T;
    restore?: (ctx: T, backup: T) => T;
}
export declare function getRetryOnErrorConfig<T extends StageObject, C extends RetryOnErrorConfig<T>>(config: AllowedStage<T, T, C>): C;
export declare class RetryOnError<T extends StageObject> extends Stage<T, RetryOnErrorConfig<T>> {
    constructor(config?: AllowedStage<T, T, RetryOnErrorConfig<T>>);
    get reportName(): string;
    toString(): string;
    backupContext(ctx: T): T;
    restoreContext(ctx: T, backup: T): T;
    compile(rebuild?: boolean): StageRun<T>;
}
//# sourceMappingURL=retryonerror.d.ts.map