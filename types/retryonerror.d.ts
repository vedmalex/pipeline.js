import { AbstractStage, BaseStageConfig, RetryOnErrorParams } from './base';
import { ExtractInput, ExtractOutput, ExtractStage, ExtractStageInput, ExtractStageOutput, InferRetryOnErrorParams, IntellisenseFor, Merge, OverwriteIfDefined } from './utility';
export declare class RetryOnError<Input, Output, Backup = string, Config extends RetryOnErrorConfig<Input, Output, Backup> = RetryOnErrorConfig<Input, Output, Backup>> extends AbstractStage<Input, Output, Config> {
    constructor(cfg: Config);
}
export type ExtractBackup<Fn extends FnBackup<any, any>> = Fn extends FnBackup<any, infer Backup> ? Backup : never;
export type FnRetry<Input> = (payload: {
    error: Error | undefined;
    input: Input;
    iteration: number;
}) => boolean | Promise<boolean>;
export type FnBackup<Input, Backup> = (payload: {
    input: Input;
}) => Backup | Promise<Backup>;
export type FnRestore<Input, Backup> = (payload: {
    input: Input;
    backup: Backup;
}) => Input | Promise<Input>;
export interface RetryOnErrorConfig<Input, Output, Backup> extends BaseStageConfig<Input, Output> {
    stage: AbstractStage<Input, Output>;
    retry: number | FnRetry<Input>;
    backup?: FnBackup<Input, Backup>;
    restore?: FnRestore<Input, Backup>;
}
export interface RetryOnErrorBuilder<TParams extends RetryOnErrorParams> {
    _def: RetryOnErrorConfig<ExtractInput<TParams>, ExtractOutput<TParams>, any>;
    build(): RetryOnError<ExtractInput<TParams>, ExtractOutput<TParams>, RetryOnErrorConfig<ExtractInput<TParams>, ExtractOutput<TParams>, any>>;
    stage<RStage extends AbstractStage<any, any>>(stage: RStage): IntellisenseFor<'retryonerror', 'stage', RetryOnErrorBuilder<Merge<InferRetryOnErrorParams<TParams>, {
        _stage: OverwriteIfDefined<TParams['_stage'], ExtractStage<RStage>>;
        _input: OverwriteIfDefined<TParams['_input'], ExtractStageInput<RStage>>;
        _output: OverwriteIfDefined<TParams['_output'], ExtractStageOutput<RStage>>;
    }>>>;
    retry<Retry extends number | FnRetry<any>>(retry: Retry): IntellisenseFor<'retryonerror', 'retry', RetryOnErrorBuilder<Merge<InferRetryOnErrorParams<TParams>, {
        _stage: OverwriteIfDefined<TParams['_retry'], Retry>;
    }>>>;
    backup<Backup extends FnBackup<ExtractInput<TParams>, any>>(backup: Backup): IntellisenseFor<'retryonerror', 'backup', RetryOnErrorBuilder<Merge<InferRetryOnErrorParams<TParams>, {
        _backup: OverwriteIfDefined<TParams['_backup'], Backup>;
        _storage: OverwriteIfDefined<TParams['_storage'], ExtractBackup<Backup>>;
    }>>>;
    restore<Restore extends FnRestore<ExtractInput<TParams>, TParams['_storage']>>(backup: Restore): IntellisenseFor<'retryonerror', 'backup', RetryOnErrorBuilder<Merge<InferRetryOnErrorParams<TParams>, {
        _restore: OverwriteIfDefined<TParams['_restore'], Restore>;
    }>>>;
}
export declare function retryonerror(_def?: RetryOnErrorConfig<any, any, any>): RetryOnErrorBuilder<InferRetryOnErrorParams<{
    _type: 'retryonerror';
}>>;
