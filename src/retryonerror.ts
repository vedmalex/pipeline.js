import z from 'zod'
import {
  AbstractStage,
  BaseStageConfig,
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

function backupIt<Input>({ input }: { input: Input }): string {
  return JSON.stringify({ input })
}

function restoreIt<Input>({ input, backup }: { input: Input; backup: string }): Input {
  return (JSON.parse(backup) as { input: Input }).input
}

async function processIt<Input, Output, Backup>(
  this: RetryOnError<Input, Output, Backup>,
  payload: { input: Input },
): Promise<Output> {
  let input = payload.input
  const needRetry = async (err: Error | undefined, iteration: number) => {
    if (err) {
      if (typeof this.config.retry === 'function') {
        return !await this.config.retry({ error: err, input, iteration })
      } else {
        return iteration < (this.config.retry ?? 1)
      }
    } else {
      return true
    }
  }

  let err = undefined
  let iter = 0
  let result: any
  let backup = this.config.backup ? await this.config.backup({ input }) : backupIt({ input }) as Backup

  while (iter === 0 || await needRetry(err, iter)) {
    if (iter > 0) {
      input = this.config.restore
        ? await this.config.restore({ input, backup })
        : restoreIt({ input, backup: backup as string })
    }
    err = undefined
    try {
      result = await this.config.stage.exec({ input })
    } catch (_error: any) {
      err = _error
    }
    iter++
  }

  if (result) {
    return result
  }
  throw new Error('no result recieved')
}

export class RetryOnError<
  Input,
  Output,
  Backup = string,
  Config extends RetryOnErrorConfig<Input, Output, Backup> = RetryOnErrorConfig<Input, Output, Backup>,
> extends AbstractStage<Input, Output, Config> {
  constructor(cfg: Config) {
    super({ ...cfg, run: processIt })
    if (!this.config.backup) {
      this.config.backup = backupIt as FnBackup<Input, Backup>
    }
    this.config = validatorRetryOnErrorConfig(this.config).parse(this.config) as unknown as Config
  }
}

export type ExtractBackup<Fn extends FnBackup<any, any>> = Fn extends FnBackup<any, infer Backup> ? Backup : never

export type FnRetry<Input> = (
  payload: { error: Error | undefined; input: Input; iteration: number },
) => boolean | Promise<boolean>

export type FnBackup<Input, Backup> = (payload: { input: Input }) => Backup | Promise<Backup>
export type FnRestore<Input, Backup> = (payload: { input: Input; backup: Backup }) => Input | Promise<Input>

export interface RetryOnErrorConfig<Input, Output, Backup> extends BaseStageConfig<Input, Output> {
  stage: AbstractStage<Input, Output>
  retry: number | FnRetry<Input>
  backup?: FnBackup<Input, Backup>
  restore?: FnRestore<Input, Backup>
}

function validatorRetryOnErrorConfig<Input, Output, Backup>(
  config: RetryOnErrorConfig<Input, Output, Backup>,
) {
  const input: z.ZodSchema = config.stage.config.input ? config.stage.config.input : z.any()
  return validatorBaseStageConfig
    .merge(validatorRunConfig(config))
    .merge(z.object({
      stage: z.instanceof(AbstractStage),
      retry: z.union([
        z.function(
          z.tuple([
            z.object({ error: z.instanceof(Error), input, iteration: z.number() }),
          ]),
          z.union([
            z.boolean(),
            z.boolean().promise(),
          ]),
        ),
        z.number(),
      ]),
      backup: z.function(
        z.tuple([
          z.object({
            input,
          }),
        ]),
        z.union([z.any(), z.any().promise()]),
      ).optional(),
      restore: z.function(
        z.tuple([
          z.object({
            input,
            backup: z.any(),
          }),
        ]),
        z.union([
          input,
          input.promise(),
        ]),
      ).optional(),
    }))
}

export interface RetryOnErrorBuilder<TParams extends RetryOnErrorParams> {
  _def: RetryOnErrorConfig<ExtractInput<TParams>, ExtractOutput<TParams>, any>
  build(): RetryOnError<
    ExtractInput<TParams>,
    ExtractOutput<TParams>,
    RetryOnErrorConfig<ExtractInput<TParams>, ExtractOutput<TParams>, any>
  >
  stage<RStage extends AbstractStage<any, any>>(
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
export function retryonerror(
  _def: RetryOnErrorConfig<any, any, any> = {} as RetryOnErrorConfig<any, any, any>,
): RetryOnErrorBuilder<InferRetryOnErrorParams<{ _type: 'retryonerror' }>> {
  return {
    _def,
    stage(stage) {
      return retryonerror({
        ..._def,
        stage,
      }) as any
    },
    retry(retry) {
      return retryonerror({
        ..._def,
        retry,
      }) as any
    },
    backup(backup) {
      return retryonerror({
        ..._def,
        backup,
      }) as any
    },
    restore(restore) {
      return retryonerror({
        ..._def,
        restore,
      }) as any
    },
    build() {
      return new RetryOnError(_def) as any
    },
  }
}
