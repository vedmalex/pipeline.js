import { Stage } from './stage';
import { AllowedStage, AnyStage, Possible, RunPipelineFunction, StageObject } from './utils/types';
import { Func3, StageConfig, StageRun } from './utils/types';
export interface RetryOnErrorConfig<T extends StageObject, R extends StageObject> extends StageConfig<T, R> {
    stage: AnyStage<T, R> | RunPipelineFunction<T, R>;
    retry: number | Func3<boolean, Possible<Error>, Possible<T>, number>;
    backup?: (ctx: Possible<T>) => Possible<T>;
    restore?: (ctx: Possible<T>, backup: Possible<T>) => Possible<T>;
}
export declare function getRetryOnErrorConfig<T extends StageObject, C extends RetryOnErrorConfig<T, R>, R extends StageObject>(config: AllowedStage<T, C, R>): C;
export declare class RetryOnError<T extends StageObject, R extends StageObject = T> extends Stage<T, RetryOnErrorConfig<T, R>, R> {
    constructor(config?: AllowedStage<T, RetryOnErrorConfig<T, R>, R>);
    get reportName(): string;
    toString(): string;
    backupContext(ctx: Possible<T>): Possible<T>;
    restoreContext(ctx: Possible<T>, backup: Possible<T>): Possible<T>;
    compile(rebuild?: boolean): StageRun<T, R>;
}
//# sourceMappingURL=retryonerror.d.ts.map