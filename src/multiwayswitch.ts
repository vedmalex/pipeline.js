import { z } from 'zod'
import {
  AbstractStage,
  BaseStageConfig,
  MultiWaySwitchCaseParams,
  MultiWaySwitchParams,
  validatorBaseStageConfig,
  validatorRunConfig,
} from './base'
import {
  ExtractInput,
  ExtractOutput,
  ExtractStage,
  ExtractStageInput,
  ExtractStageOutput,
  InferMultiWaySwitchCaseParams,
  InferMultiWaySwitchParams,
  IntellisenseFor,
  Merge,
  MergeIfDefined,
  OverwriteIfDefined,
} from './utility'
import { CreateError, ParallelError } from './error'
import _ from 'lodash'

async function processSwitchIt<Input, Output>(
  this: MultiWaySwitch<Input, Output>,
  { input }: { input: Input },
): Promise<Output> {

  const presult = await Promise.allSettled(this.config.cases.map(item => item.exec({ input })))

  let errors: Array<any> = []
  let result: { output: Output } = {} as any

  for (let i = 0; i < presult.length; i++) {
    const item = presult[i]
    if (item.status == 'fulfilled') {
      result = _.defaultsDeep(result, {output: item.value})
    } else {
      errors.push(
        new ParallelError({
          index: i,
          ctx: input[i],
          err: item.reason,
        }),
      )
    }
  }
  if (errors.length > 0) {
    throw CreateError(errors)
  }
  return result.output
}


async function processCaseIt<Input, Output>(
  this: MultiWaySwitchCase<Input, Output>,
  { input }: { input: Input },
): Promise<Output> {
  if (await this.config.evaluate({input})) {
    return this.config.stage.execute(input)
  } else {
    return input as undefined as Output
  }
}

export class MultiWaySwitch<
  Input,
  Output,
  Config extends MultWaySwitchConfig<Input, Output> = MultWaySwitchConfig<Input, Output>,
> extends AbstractStage<Input, Output, Config> {
  constructor(cfg: Config) {
    super({ ...cfg, run: processSwitchIt })
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
  constructor(cfg: Config) {
    super({ ...cfg, run: processCaseIt })
    this.config = validatorMultiWaySwitchCaseConfig(this.config).parse(this.config) as unknown as Config
  }
}


export type StageEvaluateFunction<Input> = (payload: {input: Input}) => Promise<boolean> | boolean

export interface MultiWaySwitchCaseConfig<Input, Output> extends BaseStageConfig<Input, Output> {
  stage: AbstractStage<Input, Output>
  evaluate: StageEvaluateFunction<Input>
}

export function validatorMultiWaySwitchCaseConfig<Input, Output>(
  config: MultiWaySwitchCaseConfig<Input, Output>,
) {
  const input: z.ZodSchema = config?.stage.config?.input
    ? config?.stage.config?.input
    : z.any()
  return validatorBaseStageConfig
    .merge(validatorRunConfig(config))
    .merge(z.object({
      evaluate: z.function(
        z.tuple([z.object({
          input,
        })]),
        z.union([z.boolean().promise(), z.boolean()]),
      ),
      stage: z.instanceof(AbstractStage),
    }))
}

export interface MultiWaySwitchBuilder<TParams extends MultiWaySwitchParams> {
  _def: MultWaySwitchConfig<ExtractInput<TParams>, ExtractOutput<TParams>>

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
  _def: MultiWaySwitchCaseConfig<ExtractInput<TParams>, ExtractOutput<TParams>>
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

export function multiwayswitch(
  _def: MultWaySwitchConfig<any, any> = { cases: [] } as MultWaySwitchConfig<any, any>,
): MultiWaySwitchBuilder<InferMultiWaySwitchParams<{ _type: 'multiwayswitch' }>> {
  return {
    _def: _def as MultWaySwitchConfig<any, any>,
    add(item) {
      _def.cases.push(item)
      return multiwayswitch({
        ..._def,
      }) as any
    },
    build() {
      return new MultiWaySwitch(_def) as any
    },
  }
}

export function multiwayswitchcase(
  _def: MultiWaySwitchCaseConfig<any, any> = {} as MultiWaySwitchCaseConfig<any, any>,
): MultiWaySwitchCaseBuilder<InferMultiWaySwitchCaseParams<{ _type: 'multiwayswitchcase' }>> {
  return {
    _def: _def as MultiWaySwitchCaseConfig<any, any>,
    stage(stage) {
      return multiwayswitchcase({
        ..._def,
        stage,
      }) as any
    },
    evaluate(evaluate) {
      return multiwayswitchcase({
        ..._def,
        evaluate,
      }) as any
    },
    build() {
      return new MultiWaySwitchCase(_def) as any
    },
  }
}
