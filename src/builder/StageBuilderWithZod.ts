import { z } from 'zod'
import { AbstractStage } from '../stage/AbstractStage'
import { Stage } from '../stage/stage'
import { BaseStageConfig, Run, StageConfig } from '../stage/StageConfig'
import { UnsetMarker } from '../stage/types'
import { Rescue } from '../stages/rescue'
import { RescueConfig, RescueRun } from '../stages/rescue/RescueConfig'

// TODO: проверять если нет rescue тогда параметры функции должны !!! включать обработку ошибок !!!
// TODO: если в списке параметров есть обработка ошибок то не нужно включать rescue

/**
 * @internal
 * @see https://github.com/ianstormtaylor/superstruct/blob/7973400cd04d8ad92bbdc2b6f35acbfb3c934079/src/utils.ts#L323-L325
 */
export type Simplify<TType> = TType extends any[] | Date ? TType
  : { [K in keyof TType]: TType[K] }

export type OverwriteIfDefined<TType, TWith> = UnsetMarker extends TType ? TWith
  : Simplify<TType & TWith>

export type Merge<S, D> = Simplify<
  & { [K in keyof S]: K extends keyof D ? UnsetMarker extends D[K] ? S[K] : D[K] : S[K] }
  & { [K in keyof D]: K extends keyof S ? UnsetMarker extends S[K] ? D[K] : S[K] : D[K] }
>

export type Person = { name: string }
export type Employee = OverwriteIfDefined<{ name: UnsetMarker }, Person>
export type EmployeeSimpl = Merge<Person, Merge<{ empno: number }, { empno: UnsetMarker }>>

export type StageType =
  | 'stage'
  | 'wrap'
  | 'rescue'
  | 'timeout'
  | 'retry'
  | 'ifelse'
  | 'dowhile'
  | 'multiwayswitch'
  | 'parallel'
  | 'sequential'
  | 'empty'

export type GetStage<T extends StageType, TParams> = TParams extends BuilderParams
  ? T extends 'stage' ? StageBuilder<TParams>
  : T extends 'rescue' ? RescueBuilder<TParams>
  : never
  : never

export interface BuilderParams {
  _type: unknown
  _input: unknown
  _output: unknown
  _usage: {}
  // stage
  _run: unknown
  // rescue
  _stage: unknown
}

export type ExtractInput<TParams> = TParams extends BuilderParams
  ? TParams['_input'] extends UnsetMarker ? TParams['_output'] extends UnsetMarker ? any : TParams['_output']
  : TParams['_input']
  : never

export type ExtractOutput<TParams> = TParams extends BuilderParams
  ? TParams['_output'] extends UnsetMarker ? TParams['_input'] extends UnsetMarker ? any : TParams['_input']
  : TParams['_output']
  : never

// упрощает работу с chain
export type InferParams<
  TParams extends BuilderParams,
  TBuilder,
  Usage extends keyof TBuilder,
> = {
  _type: TParams['_type']
  _input: TParams['_input']
  _output: TParams['_output']
  _usage: TParams['_usage'] & Pick<TBuilder, Usage>
  _run: TParams['_run']
  _stage: TParams['_stage']
}

export type AnyStageConfig = StageConfig<any, any>

export interface BuilderDef<TConfig extends BaseStageConfig<any, any>> {
  type: StageType
  inputs: Parser
  outputs: Parser
  cfg: TConfig
}

export interface StageDef<TConfig extends StageConfig<any, any>> extends BuilderDef<TConfig> {
}

export interface RescueDef<TConfig extends RescueConfig<any, any>> extends BuilderDef<TConfig> {
  stage: AbstractStage<any, any>
  rescue: RescueRun<any, any>
}

export type InferConfig<TStage> = TStage extends Stage<any, any, infer $TConfig> ? $TConfig
  : TStage extends Stage<infer $Input, infer $Output, any> ? StageConfig<$Input, $Output>
  : {}

export type InferContext<TStage> = TStage extends Stage<infer $Input, any> ? $Input : UnsetMarker

export function builder<TConfig extends BaseStageConfig<any, any>>(
  _def: Partial<BuilderDef<TConfig>> = {},
): Builder<{
  _type: UnsetMarker
  _input: UnsetMarker
  _output: UnsetMarker
  _usage: {
    output: 1
    run: 1
    build: 1
  }
  _run: UnsetMarker
  _stage: UnsetMarker
}> {
  return {
    _def: _def as BuilderDef<TConfig>,
    type(input) {
      if (!_def.cfg) {
        _def.cfg = {} as TConfig
      }
      /// сделать передачу типа
      _def.type = input
      switch (true) {
        case input === 'stage':
          return stage(_def as any) as any
        case input === 'rescue':
          return rescue(_def as any) as any
        default:
          throw new Error('not implemented')
      }
    },
  }
}

export function stage<TConfig extends StageConfig<any, any>>(
  _def: Partial<BuilderDef<TConfig>> = {},
): StageBuilder<{
  _type: UnsetMarker
  _input: UnsetMarker
  _output: UnsetMarker
  _usage: {
    output: 1
    run: 1
    build: 1
  }
  _run: UnsetMarker
  _stage: UnsetMarker
}> {
  return {
    _def: _def as BuilderDef<TConfig>,
    input(input) {
      if (!_def.cfg) {
        _def.cfg = {} as TConfig
      }
      _def.cfg.input = input
      return stage({
        ..._def,
        inputs: input,
      }) as any
    },
    output(output) {
      if (!_def.cfg) {
        _def.cfg = {} as TConfig
      }
      _def.cfg.output = output
      return stage({
        ..._def,
        outputs: output,
      }) as any
    },
    run(run) {
      if (!_def.cfg) {
        _def.cfg = {} as TConfig
      }
      _def.cfg.run = run as any
      return stage({
        ..._def,
      }) as any
    },
    build() {
      if (!_def.cfg) {
        _def.cfg = {} as TConfig
      }
      return new Stage(_def.cfg) as any
    },
  }
}

export function rescue<TConfig extends RescueConfig<any, any>>(
  _def: Partial<RescueDef<TConfig>> = {},
): RescueBuilder<{
  _type: UnsetMarker
  _input: UnsetMarker
  _output: UnsetMarker
  _run: UnsetMarker
  _stage: UnsetMarker
  _usage: {
    _build: 1
  }
}> {
  return {
    _def: _def as BuilderDef<TConfig>,
    stage(stage) {
      if (!_def.cfg) {
        _def.cfg = {} as TConfig
      }
      _def.cfg.stage = stage
      return rescue({
        ..._def,
        stage: stage,
      }) as any
    },
    rescue(fn) {
      if (!_def.cfg) {
        _def.cfg = {} as TConfig
      }
      if (_def.cfg.stage) {
        _def.cfg.input = _def.cfg.stage.config.input
        _def.cfg.output = _def.cfg.stage.config.output
      } else {
        throw new Error('define stage before use of rescue')
      }
      _def.cfg.rescue = fn
      return rescue({
        ..._def,
        rescue: fn as any,
      }) as any
    },
    build() {
      if (!_def.cfg) {
        _def.cfg = {} as TConfig
      }
      return new Rescue(_def.cfg) as any
    },
  }
}

export type ParserZod<TInput, TParsedInput> = {
  _input: TInput
  _output: TParsedInput
}

// export type Parser = ParserZod<any, any>
export type Parser = z.ZodTypeAny
// export type T = z.infer<Parser>

export type inferParser<TParser extends Parser> = TParser extends ParserZod<infer $TIn, infer $TOut> ? {
    in: $TIn
    out: $TOut
  }
  : UnsetMarker

type ErrorMessage<TMessage extends string> = TMessage

type InferKeys<T> = T extends object ? keyof T : never

// берет тип на основании трёх параметров
//
type SchemaType<
  TParams extends BuilderParams,
  $Parser extends Parser,
  key extends keyof TParams,
  parser extends keyof inferParser<$Parser>,
> = TParams[key] extends UnsetMarker ? $Parser
  : inferParser<$Parser>[parser] extends Record<string, unknown> | undefined
    ? TParams[key] extends Record<string, unknown> | undefined ? undefined extends inferParser<$Parser>[parser] // if current is optional the previous must be too
        ? undefined extends TParams[key] ? $Parser
        : ErrorMessage<'Cannot chain an optional parser to a required parser'>
      : $Parser
    : ErrorMessage<'All input parsers did not resolve to an object'>
  : ErrorMessage<'All input parsers did not resolve to an object'>

export interface Builder<TParams extends BuilderParams> {
  _def: BuilderDef<BaseStageConfig<ExtractInput<TParams>, ExtractOutput<TParams>>>
  type<T extends StageType>(type: T): Omit<
    GetStage<T, InferParams<TParams, Builder<TParams>, 'type'>>,
    InferKeys<TParams['_usage']> | 'type'
  >
}

export interface StageBuilder<TParams extends BuilderParams> {
  _def: BuilderDef<StageConfig<ExtractInput<TParams>, ExtractOutput<TParams>>>
  input<$Parser extends Parser>(
    schema: SchemaType<TParams, $Parser, '_input', 'in'>,
  ): Omit<
    StageBuilder<
      Merge<
        InferParams<TParams, StageBuilder<TParams>, 'input'>,
        {
          _input: OverwriteIfDefined<
            TParams['_input'],
            inferParser<$Parser>['in']
          >
        }
      >
    >,
    Exclude<InferKeys<TParams['_usage']> | 'input', 'output' | 'run'>
  >
  output<$Parser extends Parser>(
    schema: SchemaType<TParams, $Parser, '_output', 'out'>,
  ): Omit<
    StageBuilder<
      Merge<
        InferParams<TParams, StageBuilder<TParams>, 'output'>,
        {
          _output: OverwriteIfDefined<
            TParams['_output'],
            inferParser<$Parser>['in']
          >
        }
      >
    >,
    Exclude<InferKeys<TParams['_usage']> | 'ouput', 'run'>
  >
  // где-то теряется тип Params
  run(
    fn: Run<ExtractInput<TParams>, ExtractOutput<TParams>>,
  ): TParams extends BuilderParams ? Omit<
      StageBuilder<
        InferParams<TParams, StageBuilder<TParams>, 'run'>
      >,
      Exclude<InferKeys<TParams['_usage']> | 'run', 'build'>
    >
    : never
  build(): Stage<
    ExtractInput<TParams>,
    ExtractOutput<TParams>,
    StageConfig<ExtractInput<TParams>, ExtractOutput<TParams>>
  >
}

export type ExtractStage<TStage extends AbstractStage<any, any>> = TStage extends AbstractStage<any, any> ? TStage
  : never

export type ExtractStageInput<TStage extends AbstractStage<any, any>> = TStage extends AbstractStage<infer $Input, any>
  ? $Input
  : never

export type ExtractStageOutput<TStage extends AbstractStage<any, any>> = TStage extends
  AbstractStage<any, infer $Output> ? $Output : never

export interface RescueBuilder<TParams extends BuilderParams> {
  _def: BuilderDef<RescueConfig<ExtractInput<TParams>, ExtractOutput<TParams>>>
  build(): Rescue<
    ExtractInput<TParams>,
    ExtractOutput<TParams>,
    RescueConfig<ExtractInput<TParams>, ExtractOutput<TParams>>
  >
  stage<RStage extends AbstractStage<ExtractInput<TParams>, ExtractOutput<TParams>>>(
    stage: RStage,
  ): Omit<
    RescueBuilder<
      Merge<
        InferParams<TParams, RescueBuilder<TParams>, 'stage'>,
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
    >,
    InferKeys<TParams['_usage']> | 'stage'
  >
  rescue(rescue: RescueRun<ExtractInput<TParams>, ExtractOutput<TParams>>): Omit<
    RescueBuilder<
      InferParams<TParams, RescueBuilder<TParams>, 'rescue'>
    >,
    Exclude<InferKeys<TParams['_usage']> | 'rescue', 'build'>
  >
}
