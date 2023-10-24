import z from 'zod'
import { AbstractStage, BaseStageConfig, IfElseParams, validatorBaseStageConfig, validatorRunConfig } from './base'
import {
  ExtractInput,
  ExtractOutput,
  ExtractStageInput,
  ExtractStageOutput,
  InferIfElseParams,
  IntellisenseFor,
  MaySetInput,
  MaySetOutput,
  Merge,
  OverwriteIfDefined,
  UnsetMarker,
} from './utility'

export type IfElseCondition<Input> = (payload: { input: Input }) => boolean | Promise<boolean>

async function processIt<Input, Output>(
  this: IfElse<Input, Output>,
  { input }: { input: Input },
): Promise<Output> {
  const evaluate = await this.config.if({ input })
  if (evaluate) {
    return await this.config.then.exec({ input })
  } else {
    return (await this.config.else?.exec({ input })) ?? input as undefined as Output
  }
}

export class IfElse<Input, Output, Config extends IfElseConfig<Input, Output> = IfElseConfig<Input, Output>>
  extends AbstractStage<Input, Output, Config> {
  constructor(cfg: Config) {
    super({ ...cfg, run: processIt })
    this.config = validatorIfElseConfig(this.config).parse(this.config) as unknown as Config
  }
}

export interface IfElseConfig<Input, Output> extends BaseStageConfig<Input, Output> {
  if: IfElseCondition<Input>
  then: AbstractStage<Input, Output>
  else?: AbstractStage<Input, Output>
}

function validatorIfElseConfig<Input, Output>(
  config: IfElseConfig<Input, Output>,
) {
  const input = config.then.config.input ? config.then.config.input : z.any()

  return validatorBaseStageConfig
    .merge(validatorRunConfig(config))
    .merge(z.object({
      if: z.function(
        z.tuple([z.object({
          input,
        })]),
        z.union([z.boolean(), z.boolean().promise()]),
      ),
      then: z.instanceof(AbstractStage),
      else: z.instanceof(AbstractStage).optional(),
    }))
}

export interface IfElseBuilder<TParams extends IfElseParams> {
  config: IfElseConfig<ExtractInput<TParams>, ExtractOutput<TParams>>
  if(
    timeout: IfElseCondition<OverwriteIfDefined<ExtractInput<TParams>, unknown>>,
  ): IntellisenseFor<
    'ifelse',
    'if',
    IfElseBuilder<
      InferIfElseParams<TParams>
    >
  >
  then<RStage extends AbstractStage<MaySetInput<TParams>, MaySetOutput<TParams>>>(
    stage: TParams['_stage'] extends UnsetMarker ? RStage : never,
  ): TParams['_stage'] extends UnsetMarker ? IntellisenseFor<
      'ifelse',
      'then',
      IfElseBuilder<
        Merge<
          InferIfElseParams<TParams>,
          {
            _stage: OverwriteIfDefined<
              TParams['_stage'],
              ExtractStageInput<RStage>
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
    : never
  stage<RStage extends AbstractStage<MaySetInput<TParams>, MaySetOutput<TParams>>>(
    stage: TParams['_stage'] extends UnsetMarker ? RStage : never,
  ): TParams['_stage'] extends UnsetMarker ? IntellisenseFor<
      'ifelse',
      'stage',
      IfElseBuilder<
        Merge<
          InferIfElseParams<TParams>,
          {
            _stage: OverwriteIfDefined<
              TParams['_stage'],
              ExtractStageInput<RStage>
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
    : never
  else<RStage extends AbstractStage<ExtractInput<TParams>, ExtractOutput<TParams>>>(
    stage: RStage,
  ): IntellisenseFor<
    'ifelse',
    'else',
    IfElseBuilder<
      InferIfElseParams<TParams>
    >
  >
  build(): IfElse<
    ExtractInput<TParams>,
    ExtractOutput<TParams>,
    IfElseConfig<ExtractInput<TParams>, ExtractOutput<TParams>>
  >
}
export function ifelse(
  config: IfElseConfig<any, any> = {} as IfElseConfig<any, any>,
): IfElseBuilder<InferIfElseParams<{ _type: 'ifelse' }>> {
  return {
    config,
    if(condition) {
      return ifelse({
        ...config,
        if: condition,
      }) as any
    },
    stage(stage) {
      return ifelse({
        ...config,
        then: stage,
      }) as any
    },
    then(stage) {
      return ifelse({
        ...config,
        then: stage,
      }) as any
    },
    else(stage) {
      return ifelse({
        ...config,
        else: stage,
      }) as any
    },
    build() {
      return new IfElse(config) as any
    },
  }
}
