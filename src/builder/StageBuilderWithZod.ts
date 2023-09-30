import { z } from 'zod'
import { ComplexError, CreateError } from '../stage/errors'
import { Stage } from '../stage/stage'
import { Config, StageConfig } from '../stage/StageConfig'
import { CallbackFunction, isRunPipelineFunction, LegacyCallback, StageObject, StageRun, UnsetMarker } from '../stage/types'

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
  | 'timeout'
  | 'retry'
  | 'ifelse'
  | 'dowhile'
  | 'multiwayswitch'
  | 'parallel'
  | 'sequential'
  | 'empty'

  export type GetStage<T extends StageType, TParams extends BuilderParams> =
  T extends 'stage' ? StageBuilder<TParams> : never

export interface BuilderParams {
  _type: unknown
  _input: unknown
  _output: unknown
  _usage: {}
}

export type ExtractInput<TParams extends BuilderParams> = TParams['_input'] extends UnsetMarker
  ? TParams['_output'] extends UnsetMarker ? any : TParams['_output']
  : TParams['_input']

export type ExtractOutput<TParams extends BuilderParams> = TParams['_output'] extends UnsetMarker
  ? TParams['_input'] extends UnsetMarker ? any : TParams['_input']
  : TParams['_output']

// упрощает работу с chain
export type InferParams<TParams extends BuilderParams, Usage extends keyof StageBuilder<TParams>> = {
  _type: TParams['_type']
  _input: TParams['_input']
  _output: TParams['_output']
  _usage: TParams['_usage'] & Pick<StageBuilder<TParams>, Usage>
}

export type AnyStageConfig = StageConfig<any, any>

export interface BuilderDef<TConfig extends Config<any, any>> {
  type: StageType
  inputs: Parser
  outputs: Parser
  cfg: TConfig
}

export interface StageDef<TConfig extends StageConfig<any, any>> extends BuilderDef<TConfig> {
}

export type InferConfig<TStage> = TStage extends Stage<any, any, infer $TConfig> ? $TConfig
  : TStage extends Stage<infer $Input, infer $Output, any> ? StageConfig<$Input, $Output>
  : {}

export type InferContext<TStage> = TStage extends Stage<infer $Input, any> ? $Input : UnsetMarker

export function builder<TConfig extends Config<any, any>>(
  _def: Partial<BuilderDef<TConfig>> = {},
): Builder<{
  _type: UnsetMarker
  _input: UnsetMarker
  _output: UnsetMarker
  _usage: {}
}> {
  return {
    _def: _def as BuilderDef<TConfig>,
    type(input) {
      if (!_def.cfg) {
        _def.cfg = {} as TConfig
      }
      /// сделать передачу типа
      _def.type = input
      return builder({
        ..._def,
      }) as any
    },
    input(input) {
      if (!_def.cfg) {
        _def.cfg = {} as TConfig
      }
      _def.cfg.input = input
      return builder({
        ..._def,
        inputs: input,
      }) as any
    },
    output(output) {
      if (!_def.cfg) {
        _def.cfg = {} as TConfig
      }
      _def.cfg.output = output
      return builder({
        ..._def,
        outputs: output,
      }) as any
    },
    name(name) {
      if (!_def.cfg) {
        _def.cfg = {} as TConfig
      }
      _def.cfg.name = name
      return builder({
        ..._def,
      }) as any
    },
    rescue(rescue) {
      if (!_def.cfg) {
        _def.cfg = {} as TConfig
      }
      _def.cfg.rescue = rescue as any
      return builder({
        ..._def,
      }) as any
    },
    compile(compile) {
      if (!_def.cfg) {
        _def.cfg = {} as TConfig
      }
      _def.cfg.compile = compile as any
      return builder({
        ..._def,
      }) as any
    },
  }
}

export function stage<TConfig extends StageConfig<any, any>>(
  _def: Partial<BuilderDef<TConfig>> = {},
): StageBuilder<{
  _type: UnsetMarker
  _input: UnsetMarker
  _output: UnsetMarker
  _usage: {}
}> {
  return {
    _def: _def as BuilderDef<TConfig>,
    type(input) {
      if (!_def.cfg) {
        _def.cfg = {} as TConfig
      }
      /// сделать передачу типа
      _def.type = input
      return stage({
        ..._def,
      }) as any
    },
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
      if (run && isRunPipelineFunction(run)) {
        _def.cfg.run = run as any
      } else {
        throw CreateError('run should be a `RunPipelineFunction`')
      }
      return stage({
        ..._def,
      }) as any
    },
    name(name) {
      if (!_def.cfg) {
        _def.cfg = {} as TConfig
      }
      _def.cfg.name = name
      return stage({
        ..._def,
      }) as any
    },
    rescue(rescue) {
      if (!_def.cfg) {
        _def.cfg = {} as TConfig
      }
      _def.cfg.rescue = rescue as any
      return stage({
        ..._def,
      }) as any
    },
    compile(compile) {
      if (!_def.cfg) {
        _def.cfg = {} as TConfig
      }
      _def.cfg.compile = compile as any
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
    config() {
      if (!_def.cfg) {
        _def.cfg = {} as TConfig
      }
      return _def.cfg
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
  _def: BuilderDef<Config<ExtractInput<TParams>, ExtractOutput<TParams>>>
  // TODO: сделать чтобы после вводв type, показывался правильный тип
  // Get
  type<T extends StageType>(type: T): Omit<
    GetStage<T, InferParams<TParams, 'type'>>,
    InferKeys<TParams['_usage']> | 'type'
  >
  /**
   * input for stage
   * @param schema only object allowed
   */
  input<$Parser extends Parser>(
    schema: SchemaType<TParams, $Parser, '_input', 'in'>,
  ): Omit<
    Builder<
      Merge<
        InferParams<TParams, 'input'>,
        {
          _input: OverwriteIfDefined<
            TParams['_input'],
            inferParser<$Parser>['in']
          >
        }
      >
    >,
    InferKeys<TParams['_usage']> | 'input'
  >
  /**
   * output of stage
   * @param schema only object allowed
   */
  output<$Parser extends Parser>(
    schema: SchemaType<TParams, $Parser, '_output', 'out'>,
  ): Omit<
    Builder<
      Merge<
        InferParams<TParams, 'output'>,
        {
          _output: OverwriteIfDefined<
            TParams['_output'],
            inferParser<$Parser>['in']
          >
        }
      >
    >,
    InferKeys<TParams['_usage']> | 'ouput'
  >
  name(name: string): Omit<
    Builder<
      InferParams<TParams, 'name'>
    >,
    InferKeys<TParams['_usage']> | 'name'
  >
  rescue(rescue: Rescue<TParams['_input']>): Omit<
    Builder<
      InferParams<TParams, 'rescue'>
    >,
    InferKeys<TParams['_usage']> | 'rescue'
  >
  compile(fn: Compile<TParams['_input']>): Omit<
    Builder<
      InferParams<TParams, 'compile'>
    >,
    InferKeys<TParams['_usage']> | 'compile'
  >
}

export interface StageBuilder<TParams extends BuilderParams> extends Builder<TParams> {
  _def: BuilderDef<StageConfig<ExtractInput<TParams>, ExtractOutput<TParams>>>
    /**
   * input for stage
   * @param schema only object allowed
   */
  input<$Parser extends Parser>(
    schema: SchemaType<TParams, $Parser, '_input', 'in'>,
  ): Omit<
    StageBuilder<
      Merge<
        InferParams<TParams, 'input'>,
        {
          _input: OverwriteIfDefined<
            TParams['_input'],
            inferParser<$Parser>['in']
          >
        }
      >
    >,
    InferKeys<TParams['_usage']> | 'input'
  >
  /**
   * output of stage
   * @param schema only object allowed
   */
  output<$Parser extends Parser>(
    schema: SchemaType<TParams, $Parser, '_output', 'out'>,
  ): Omit<
    StageBuilder<
      Merge<
        InferParams<TParams, 'output'>,
        {
          _output: OverwriteIfDefined<
            TParams['_output'],
            inferParser<$Parser>['in']
          >
        }
      >
    >,
    InferKeys<TParams['_usage']> | 'ouput'
  >
  name(name: string): Omit<
    StageBuilder<
      InferParams<TParams, 'name'>
    >,
    InferKeys<TParams['_usage']> | 'name'
  >
  rescue(rescue: Rescue<TParams['_input']>): Omit<
    StageBuilder<
      InferParams<TParams, 'rescue'>
    >,
    InferKeys<TParams['_usage']> | 'rescue'
  >
  compile(fn: Compile<TParams['_input']>): Omit<
    StageBuilder<
      InferParams<TParams, 'compile'>
    >,
    InferKeys<TParams['_usage']> | 'compile'
  >
  run(
    fn: CustomRun<ExtractInput<TParams>, ExtractOutput<TParams>>,
  ): Omit<
    StageBuilder<
      InferParams<TParams, 'run'>
    >,
    InferKeys<TParams['_usage']> | 'run'
  >
  build(): Stage<
    ExtractInput<TParams>,
    ExtractOutput<TParams>,
    StageConfig<ExtractInput<TParams>, ExtractOutput<TParams>>
  >
  config(): StageConfig<ExtractInput<TParams>, ExtractOutput<TParams>>
}

export type CustomRunInput<$P1> = {
  input: $P1
}

export type MaybePromise<TType> = Promise<TType> | TType

export type CustomRun<$P1, $P2> = (
  arg: CustomRunInput<$P1>,
) => MaybePromise<$P2>

export type CustomRunLegacy<$P1, $P2> = (
  this: $P1 extends StageObject ? $P1 : never,
  p1?: ComplexError | $P1 | undefined,
  p2?: $P1 | undefined,
  p3?: LegacyCallback<$P2> | undefined,
) => Promise<$P2> | $P2 | void

export type Rescue<$P1> = (
  this: $P1 extends StageObject ? $P1 : never,
  p1?: Error | $P1 | undefined,
  p2?: $P1 | undefined,
  p3?: CallbackFunction<$P1, $P1> | undefined,
) => Promise<$P1> | $P1 | void

export type RescueLegacy<$P1> = (
  this: $P1 extends StageObject ? $P1 : never,
  p1?: Error | $P1 | undefined,
  p2?: $P1 | undefined,
  p3?: LegacyCallback<$P1> | undefined,
) => Promise<$P1> | $P1 | void

export type Ensure<$P1> = (
  p1?: $P1 extends StageObject ? $P1 : never,
  p2?: CallbackFunction<$P1, $P1> | undefined,
) => Promise<$P1> | $P1 | void

export type EnsureLeacgy<$P1> = (
  p1?: $P1 extends StageObject ? $P1 : never,
  p2?: LegacyCallback<$P1> | undefined,
) => Promise<$P1> | $P1 | void

export type ValidateFn<$P1> = (
  this: $P1 extends StageObject ? $P1 : never,
  p1?: $P1 | undefined,
  p2?: CallbackFunction<boolean, boolean> | undefined,
) => Promise<boolean> | boolean | void

export type ValidateFnLegacy<$P1> = (
  this: $P1 extends StageObject ? $P1 : never,
  p1?: $P1 | undefined,
  p2?: LegacyCallback<boolean> | undefined,
) => Promise<boolean> | boolean | void

export type Compile<TStage> = (
  this: TStage extends Stage<infer $In, infer $Out> ? StageRun<$In, $Out> : never,
  rebuild?: boolean,
) => TStage extends Stage<infer $In, infer $Out> ? StageRun<$In, $Out> : never

// const st = createBuilder()
//   .input(z.object({ name: z.string() }))
//   .output(z.object({ full: z.string() }))
//   .name('stage')
//   .rescue(function (err, ctx) {
//   })
//   .ensure((ctx, done) => {
//     return ctx ?? ctx
//   })
//   .run(function () {
//     this
//   })
//   .build()

// const st2 = createBuilder()
// .input(z.object({ name: z.string() }))
// .output(z.object({ full: z.string() }))
// .name('stage')
// .rescue(function (err, ctx) {
// })
// .ensure((ctx, done) => {
//   return ctx ?? ctx
// })
// .run(function () {
//   this
// })

// st2.build()
