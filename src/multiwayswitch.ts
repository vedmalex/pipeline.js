import { z } from 'zod'
import {
  AbstractStage,
  BaseStageConfig,
  BuilderDef,
  MultiWaySwitchCaseParams,
  MultiWaySwitchParams,
  validatorBaseStageConfig,
  validatorRunConfig,
} from './base'
import {
  ErrorMessage,
  ExtractInput,
  ExtractOutput,
  ExtractStage,
  ExtractStageInput,
  ExtractStageOutput,
  InferMultiWaySwitchCaseParams,
  InferMultiWaySwitchParams,
  inferParser,
  InferWrapParams,
  IntellisenseFor,
  Merge,
  MergeIfDefined,
  OverwriteIfDefined,
  Parser,
  SchemaType,
} from './utility'

// override compile(rebuild: boolean = false): StageRun<Input, Output> {
//   let run: StageRun<Input, Output> = (err, ctx, done) => {
//     let iter = 0
//     let errors: Array<Error> = []
//     let hasError = false
//     let next = (index: number) => {
//       return makeCallback((err: unknown, retCtx: unknown) => {
//         iter++
//         let cur = this.config.cases[index]
//         let res: Possible<Output> = null
//         if (err) {
//           if (!hasError) {
//             hasError = true
//           }
//           errors.push(err as Error)
//         } else {
//           if (cur.config.combine) {
//             res = cur.config.combine(ctx, retCtx)
//             if (!res) {
//               throw new Error('combine MUST return value')
//             }
//           }
//         }

//         if (iter >= this.config.cases.length) {
//           return done(makeCallbackArgs(hasError ? errors : undefined, res ?? ctx as unknown as Output))
//         }
//       })
//     }

//     for (let i = 0; i < this.config.cases.length; i++) {
//       let stg = this.config.cases[i]
//       let lctx = stg.config.split?.(ctx) ?? ctx as unknown
//       run_or_execute(stg.config.stage, err, lctx, next(i) as CallbackFunction<unknown, unknown>)
//     }

//     if (this.config.cases.length === 0) {
//       return done(makeCallbackArgs(err, ctx as unknown as Output))
//     }
//   }

//   this.run = run

//   return super.compile(rebuild)
// }

async function processIt<Input, Output>(
  this: MultiWaySwitch<Input, Output>,
  input: Input,
): Promise<Output> {
  return input as any
}

export class MultiWaySwitch<
  Input,
  Output,
  Config extends MultWaySwitchConfig<Input, Output> = MultWaySwitchConfig<Input, Output>,
> extends AbstractStage<Input, Output, Config> {
  constructor(cfg: Config) {
    super({ ...cfg, run: processIt })
    this.config = validatorMultiWaySwitchConfig(this.config).parse(this.config) as unknown as Config
  }
}

export function validatorMultiWaySwitchConfig<Input, Output>(
  config: BaseStageConfig<Input, Output>,
) {
  return validatorBaseStageConfig
    .merge(validatorRunConfig(config))
    .merge(z.object({
      cases: z.array(z.instanceof(MultiWaySwitchCase)),
    }))
}

export interface MultWaySwitchConfig<Input, Output> extends BaseStageConfig<Input, Output> {
  cases: Array<MultiWaySwitchCase<Input, Output>>
}

export class MultiWaySwitchCase<
  Input,
  Output,
  Config extends MultiWaySwitchCaseConfig<Input, Output> = MultiWaySwitchCaseConfig<
    Input,
    Output
  >,
> extends AbstractStage<Input, Output, Config> {
}

export type StageEvaluateFunction<Input> = (ctx: Input) => Promise<boolean> | boolean

export interface MultiWaySwitchCaseConfig<Input, Output> extends BaseStageConfig<Input, Output> {
  stage: AbstractStage<Input, Output>
  evaluate: StageEvaluateFunction<Input>
}

export function validatorMultWaySwitchCaseConfig<Input, Output>(
  config: MultiWaySwitchCaseConfig<Input, Output>,
) {
  const input: z.ZodSchema = config?.stage.config?.input
    ? config?.stage.config?.input
    : z.any()
  return validatorBaseStageConfig
    .merge(validatorRunConfig(config))
    .merge(z.object({
      evaluate: z.function(z.tuple([input]), z.union([z.boolean().promise(), z.boolean()])),
      stage: z.instanceof(AbstractStage),
    }))
}

export interface MultWaySwitchConfigDef<TConfig extends MultWaySwitchConfig<any, any>> extends BuilderDef<TConfig> {
  cases: Array<MultiWaySwitchCase<any, any>>
}

export interface MultiWaySwitchCaseDef<TConfig extends MultiWaySwitchCaseConfig<any, any>> extends BuilderDef<TConfig> {
  stage: AbstractStage<any, any>
  evaluate: StageEvaluateFunction<any>
}

export interface MultiWaySwitchBuilder<TParams extends MultiWaySwitchParams> {
  _def: BuilderDef<
    MultWaySwitchConfig<ExtractInput<TParams>, ExtractOutput<TParams>>
  >

  build<I extends ExtractInput<TParams>, O extends ExtractOutput<TParams>>(): MultiWaySwitch<
    I,
    O,
    MultWaySwitchConfig<I, O>
  >

  add<AddCase extends MultiWaySwitchCase<any, any>>(
    input: AddCase,
  ): IntellisenseFor<
    'multiwayswitch',
    'add',
    MultiWaySwitchBuilder<
      Merge<
        InferMultiWaySwitchParams<TParams>,
        {
          _input: MergeIfDefined<
            TParams['_input'],
            ExtractStageInput<AddCase>
          >
          _output: MergeIfDefined<
            TParams['_output'],
            ExtractStageOutput<AddCase>
          >
        }
      >
    >
  >
}

export interface MultiWaySwitchCaseBuilder<TParams extends MultiWaySwitchCaseParams> {
  _def: BuilderDef<
    MultiWaySwitchCaseConfig<ExtractInput<TParams>, ExtractOutput<TParams>>
  >
  build(): MultiWaySwitchCase<
    ExtractInput<TParams>,
    ExtractOutput<TParams>
  >
  stage<RStage extends AbstractStage<any, any>>(
    stage: RStage,
  ): IntellisenseFor<
    'multiwayswitchcase',
    'stage',
    MultiWaySwitchCaseBuilder<
      Merge<
        InferMultiWaySwitchCaseParams<TParams>,
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
  evaluate(
    evaluate: StageEvaluateFunction<ExtractStageInput<TParams['_stage']>>,
  ): IntellisenseFor<
    'multiwayswitchcase',
    'evaluate',
    MultiWaySwitchCaseBuilder<
      Merge<
        InferMultiWaySwitchCaseParams<TParams>,
        {
          _evaluate: OverwriteIfDefined<
            TParams['_evaluate'],
            true
          >
        }
      >
    >
  >
}
