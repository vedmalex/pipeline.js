import { Stage } from './stage';
import { ComplexError } from './utils/ErrorList';
import { AllowedStage, AnyStage, Possible, RunPipelineFunction, StageObject } from './utils/types';
import { Func3, StageConfig, StageRun } from './utils/types';
export interface RetryOnErrorConfig<T extends StageObject> extends StageConfig<T> {
    stage: AnyStage<T> | RunPipelineFunction<T>;
    retry: number | Func3<boolean, Possible<ComplexError>, Possible<T>, number>;
    backup?: (ctx: Possible<T>) => Possible<T>;
    restore?: (ctx: Possible<T>, backup: Possible<T>) => Possible<T>;
}
export declare function getRetryOnErrorConfig<T extends StageObject, C extends RetryOnErrorConfig<T>>(config: AllowedStage<T, C>): C;
export declare class RetryOnError<T extends StageObject> extends Stage<T, RetryOnErrorConfig<T>> {
    constructor(config?: AllowedStage<T, RetryOnErrorConfig<T>>);
    get reportName(): string;
    toString(): string;
    backupContext(ctx: Possible<T>): Possible<T>;
    restoreContext(ctx: Possible<T>, backup: Possible<T>): Possible<T>;
    compile(rebuild?: boolean): StageRun<T>;
}
//# sourceMappingURL=retryonerror.d.ts.map