import { z } from 'zod'
import {
  AbstractStage,
  BaseStageConfig,
  BuilderDef,
  BuilderParams,
  validatorBaseStageConfig,
  validatorRunConfig,
} from './base'
import {
  ExtractInput,
  ExtractOutput,
  InferParams,
  inferParser,
  IntellisenseFor,
  Merge,
  OverwriteIfDefined,
  Parser,
  SchemaType,
  UnsetMarker,
} from './utility'

export type IfElseCondition<Input> = (input: Input) => boolean | Promise<boolean>

async function processIt<Input, Output>(
  this: IfElse<Input, Output>,
  input: Input,
): Promise<Output> {
  const evaluate = await this.config.condition(input)
  if (evaluate) {
    return await this.config.truthy.exec(input)
  } else {
    return (await this.config.falsy?.exec(input)) ?? input as undefined as Output
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
  condition: IfElseCondition<Input>
  truthy: AbstractStage<Input, Output>
  falsy?: AbstractStage<Input, Output>
}

export function validatorIfElseConfig<Input, Output>(
  config: IfElseConfig<Input, Output>,
) {
  const input = config.truthy.config.input ? config.truthy.config.input : z.any()

  return validatorBaseStageConfig
    .merge(validatorRunConfig(config))
    .merge(z.object({
      truthy: z.instanceof(AbstractStage),
      falsy: z.instanceof(AbstractStage).optional(),
      condition: z.function(z.tuple([input]), z.union([z.boolean(), z.boolean().promise()])),
    }))
}

export interface IfElseDef<TConfig extends IfElseConfig<any, any>> extends BuilderDef<TConfig> {
  condition: IfElseCondition<any>
  truthy: AbstractStage<any, any>
  falsy: AbstractStage<any, any>
}
export interface IfElseBuilder<TParams extends BuilderParams> {
  _def: BuilderDef<IfElseConfig<ExtractInput<TParams>, ExtractOutput<TParams>>>
  build(): IfElse<
    ExtractInput<TParams>,
    ExtractOutput<TParams>,
    IfElseConfig<ExtractInput<TParams>, ExtractOutput<TParams>>
  >
  input<$Parser extends Parser>(
    schema: SchemaType<TParams, $Parser, '_input', 'in'>,
  ): IntellisenseFor<
    'ifelse',
    'input',
    IfElseBuilder<
      Merge<
        InferParams<TParams>,
        {
          _input: OverwriteIfDefined<
            TParams['_input'],
            inferParser<$Parser>['in']
          >
        }
      >
    >
  >
  output<$Parser extends Parser>(
    schema: SchemaType<TParams, $Parser, '_output', 'out'>,
  ): IntellisenseFor<
    'ifelse',
    'output',
    IfElseBuilder<
      Merge<
        InferParams<TParams>,
        {
          _output: OverwriteIfDefined<
            TParams['_output'],
            inferParser<$Parser>['in']
          >
        }
      >
    >
  >
  truthy<RStage extends AbstractStage<ExtractInput<TParams>, ExtractOutput<TParams>>>(
    stage: RStage,
  ): IntellisenseFor<
    'ifelse',
    'truthy',
    IfElseBuilder<
      InferParams<TParams>
    >
  >
  falsy<RStage extends AbstractStage<ExtractInput<TParams>, ExtractOutput<TParams>>>(
    stage: RStage,
  ): IntellisenseFor<
    'ifelse',
    'falsy',
    IfElseBuilder<
      InferParams<TParams>
    >
  >
  condition(
    timeout: IfElseCondition<ExtractInput<TParams>>,
  ): IntellisenseFor<
    'ifelse',
    'condition',
    IfElseBuilder<
      InferParams<TParams>
    >
  >
}
export function ifelse<TConfig extends IfElseConfig<any, any>>(
  _def: Partial<IfElseDef<TConfig>> = {},
): IfElseBuilder<{
  _type: UnsetMarker
  _input: UnsetMarker
  _output: UnsetMarker
  _run: UnsetMarker
  _stage: UnsetMarker
  _wrapee_input: UnsetMarker
  _wrapee_output: UnsetMarker
}> {
  return {
    _def: _def as BuilderDef<TConfig>,
    input(input) {
      if (!_def.cfg) {
        _def.cfg = {} as TConfig
      }
      _def.cfg.input = input
      return ifelse({
        ..._def,
        inputs: input,
      }) as any
    },
    output(output) {
      if (!_def.cfg) {
        _def.cfg = {} as TConfig
      }
      _def.cfg.output = output
      return ifelse({
        ..._def,
        outputs: output,
      }) as any
    },
    truthy(truthy) {
      if (!_def.cfg) {
        _def.cfg = {} as TConfig
      }
      _def.cfg.truthy = truthy
      return ifelse({
        ..._def,
        truthy: truthy,
      }) as any
    },
    falsy(falsy) {
      if (!_def.cfg) {
        _def.cfg = {} as TConfig
      }
      _def.cfg.falsy = falsy
      return ifelse({
        ..._def,
        falsy: falsy,
      }) as any
    },
    condition(condition) {
      if (!_def.cfg) {
        _def.cfg = {} as TConfig
      }
      _def.cfg.condition = condition
      return ifelse({
        ..._def,
        condition: condition,
      }) as any
    },
    build() {
      if (!_def.cfg) {
        _def.cfg = {} as TConfig
      }
      return new IfElse(_def.cfg) as any
    },
  }
}
