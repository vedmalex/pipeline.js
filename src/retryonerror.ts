import { z } from 'zod'
import {
  AbstractStage,
  BaseStageConfig,
  BuilderDef,
  RetryOnErrorParams,
  validatorBaseStageConfig,
  validatorRunConfig,
} from './base'
import {
  ExtractInput,
  ExtractOutput,
  ExtractStage,
  ExtractStageInput,
  ExtractStageOutput,
  InferRetryOnErrorParams,
  IntellisenseFor,
  Merge,
  OverwriteIfDefined,
} from './utility'

async function processIt<Input, Output, Backup>(
  this: RetryOnError<Input, Output, Backup>,
  input: Input,
): Promise<Output> {
  const needRetry = async (err: Error | undefined, iter: number) => {
    if (err) {
      if (typeof this.config.retry === 'function') {
        return !await this.config.retry(err, input, iter)
      } else {
        return iter > (this.config.retry ?? 1)
      }
    } else {
      return true
    }
  }

  let err
  let iter = 0
  let result: Output | undefined = undefined
  do {
    err = undefined
    try {
      result = await this.config.stage.exec(input)
    } catch (_error: any) {
      err = _error
    }
  } while (await needRetry(err, ++iter))
  if (result) {
    return result
  }
  throw new Error('no result recieved')
}

export class RetryOnError<
  Input,
  Output,
  Backup,
  Config extends RetryOnErrorConfig<Input, Output, Backup> = RetryOnErrorConfig<Input, Output, Backup>,
> extends AbstractStage<Input, Output, Config> {
  constructor(cfg: Config) {
    super({ ...cfg, run: processIt })
    this.config = validatorRetryOnErrorConfig(this.config).parse(this.config) as unknown as Config
  }
}

export type ExtractBackup<Fn extends FnBackup<any, any>> = Fn extends FnBackup<any, infer Backup> ? Backup : never

export type FnRetry<Input> = (err: Error | undefined, context: Input, iteration: number) => boolean | Promise<boolean>
export type FnBackup<Input, Backup> = (ctx: Input) => Backup
export type FnRestore<Input, Backup> = (ctx: Input, backup: Backup) => Input

export interface RetryOnErrorConfig<Input, Output, Backup> extends BaseStageConfig<Input, Output> {
  stage: AbstractStage<Input, Output>
  retry: number | FnRetry<Input>
  backup?: FnBackup<Input, Backup>
  restore?: FnRestore<Input, Backup>
}

export function validatorRetryOnErrorConfig<Input, Output, Backup>(
  config: RetryOnErrorConfig<Input, Output, Backup>,
) {
  const input: z.ZodSchema = config.stage.config.input ? config.stage.config.input : z.any()
  return validatorBaseStageConfig
    .merge(validatorRunConfig(config))
    .merge(z.object({
      stage: z.instanceof(AbstractStage),
      retry: z.function(z.tuple([
        z.instanceof(Error),
        input,
        z.number(),
      ])),
      backup: z.function(z.tuple([input]), z.any()).optional(),
      restore: z.function(z.tuple([input, z.any()]), input).optional(),
    }))
}

export interface RetryOnErrorDef<TConfig extends RetryOnErrorConfig<any, any, any>> extends BuilderDef<TConfig> {
  stage: AbstractStage<any, any>
  retry: number | FnRetry<any>
  backup: (ctx: any) => any
  restore: (ctx: any, backup: any) => any
}

export interface RetryOnErrorBuilder<TParams extends RetryOnErrorParams> {
  _def: BuilderDef<RetryOnErrorConfig<ExtractInput<TParams>, ExtractOutput<TParams>, any>>
  build(): RetryOnError<
    ExtractInput<TParams>,
    ExtractOutput<TParams>,
    RetryOnErrorConfig<ExtractInput<TParams>, ExtractOutput<TParams>, any>
  >
  stage<RStage extends AbstractStage<ExtractInput<TParams>, ExtractOutput<TParams>>>(
    stage: RStage,
  ): IntellisenseFor<
    'retryonerror',
    'stage',
    RetryOnErrorBuilder<
      Merge<
        InferRetryOnErrorParams<TParams>,
        {
          _stage: OverwriteIfDefined<
            TParams['_stage'],
            ExtractStage<RStage>
          >
          _input: OverwriteIfDefined<
            TParams['_input'],
            ExtractStageInput<RStage>
          >
          _output: OverwriteIfDefined<
            TParams['_output'],
            ExtractStageOutput<RStage>
          >
        }
      >
    >
  >
  retry<Retry extends number | FnRetry<any>>(retry: Retry): IntellisenseFor<
    'retryonerror',
    'retry',
    RetryOnErrorBuilder<
      Merge<
        InferRetryOnErrorParams<TParams>,
        {
          _stage: OverwriteIfDefined<
            TParams['_retry'],
            Retry
          >
        }
      >
    >
  >
  backup<Backup extends FnBackup<ExtractInput<TParams>, any>>(backup: Backup): IntellisenseFor<
    'retryonerror',
    'backup',
    RetryOnErrorBuilder<
      Merge<
        InferRetryOnErrorParams<TParams>,
        {
          _backup: OverwriteIfDefined<
            TParams['_backup'],
            Backup
          >
          _storage: OverwriteIfDefined<
            TParams['_storage'],
            ExtractBackup<Backup>
          >
        }
      >
    >
  >
  restore<Restore extends FnRestore<ExtractInput<TParams>, TParams['_storage']>>(backup: Restore): IntellisenseFor<
    'retryonerror',
    'backup',
    RetryOnErrorBuilder<
      Merge<
        InferRetryOnErrorParams<TParams>,
        {
          _restore: OverwriteIfDefined<
            TParams['_restore'],
            Restore
          >
        }
      >
    >
  >
}
export function retryonerror<TConfig extends RetryOnErrorConfig<any, any, any>>(
  _def: Partial<RetryOnErrorDef<TConfig>> = {},
): RetryOnErrorBuilder<InferRetryOnErrorParams<{ _type: 'retryonerror' }>> {
  return {
    _def: _def as BuilderDef<TConfig>,
    stage(stage) {
      if (!_def.cfg) {
        _def.cfg = {} as TConfig
      }
      _def.cfg.stage = stage
      return retryonerror({
        ..._def,
        stage: stage,
      }) as any
    },
    retry(retry) {
      if (!_def.cfg) {
        _def.cfg = {} as TConfig
      }
      _def.cfg.retry = retry
      return retryonerror({
        ..._def,
        retry: retry,
      }) as any
    },
    backup(backup) {
      if (!_def.cfg) {
        _def.cfg = {} as TConfig
      }
      _def.cfg.backup = backup
      return retryonerror({
        ..._def,
        backup: backup,
      }) as any
    },
    restore(restore) {
      if (!_def.cfg) {
        _def.cfg = {} as TConfig
      }
      _def.cfg.restore = restore
      return retryonerror({
        ..._def,
        restore: restore,
      }) as any
    },
    build() {
      if (!_def.cfg) {
        _def.cfg = {} as TConfig
      }
      return new RetryOnError(_def.cfg) as any
    },
  }
}
