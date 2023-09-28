import { z } from 'zod'
import { ComplexError, CreateError } from './errors'
import { Stage } from './stage'
import { StageConfig } from './StageConfig'
import { CallbackFunction, isRunPipelineFunction, StageObject, StageRun, UnsetMarker } from './types'

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

export interface BuilderParams {
  _stage: unknown
  _input: unknown
  _output: unknown
  _usage: {}
}

// упрощает работу с chain
export type InferParams<TParams extends BuilderParams, Usage extends keyof StageBuilder<TParams>> = {
  _stage: TParams['_stage']
  _input: TParams['_input']
  _output: TParams['_output']
  _usage: TParams['_usage'] & Pick<StageBuilder<TParams>, Usage>
}

export type AnyStageConfig = StageConfig<any>

export type BuilderDef<TStage> = {
  stage: TStage
  inputs: Parser
  outputs: Parser
  cfg: InferConfig<TStage>
}

export type InferConfig<TStage> = TStage extends Stage<any, infer $TConfig> ? $TConfig
  : TStage extends Stage<infer $Input, any> ? StageConfig<$Input>
  : {}

export type InferContext<TStage> = TStage extends Stage<infer $Input, any> ? $Input : UnsetMarker

export function stage<TStage extends Stage<any>>(
  _def: Partial<BuilderDef<TStage>> = {},
): StageBuilder<{
  _stage: TStage
  _input: UnsetMarker
  _output: UnsetMarker
  _usage: {}
}> {
  return {
    _def: _def as BuilderDef<TStage>,
    input(input) {
      if (!_def.cfg) {
        _def.cfg = {} as InferConfig<TStage>
      }
      _def.cfg.input = input
      return stage({
        ..._def,
        inputs: input,
      }) as any
    },
    output(output) {
      if (!_def.cfg) {
        _def.cfg = {} as InferConfig<TStage>
      }
      _def.cfg.output = output
      return stage({
        ..._def,
        outputs: output,
      }) as any
    },
    run(run) {
      if (!_def.cfg) {
        _def.cfg = {} as InferConfig<TStage>
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
        _def.cfg = {} as InferConfig<TStage>
      }
      _def.cfg.name = name
      return stage({
        ..._def,
      }) as any
    },
    rescue(rescue) {
      if (!_def.cfg) {
        _def.cfg = {} as InferConfig<TStage>
      }
      _def.cfg.rescue = rescue as any
      return stage({
        ..._def,
      }) as any
    },
    compile(compile) {
      if (!_def.cfg) {
        _def.cfg = {} as InferConfig<TStage>
      }
      _def.cfg.compile = compile as any
      return stage({
        ..._def,
      }) as any
    },
    build() {
      return new Stage<InferContext<TStage>, InferConfig<TStage>>(
        (_def as BuilderDef<TStage>).cfg as InferConfig<TStage>,
      ) as any
    },
  }
}

export type ParserZod<TInput, TParsedInput> = {
  _input: TInput
  _output: TParsedInput
}

// export type Parser = ParserZod<any, any>
export type Parser = z.ZodTypeAny

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

export interface StageBuilder<TParams extends BuilderParams> {
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
  run<$Input = TParams['_input']>(fn: CustomRun<$Input>): Omit<
    StageBuilder<
      InferParams<TParams, 'run'>
    >,
    InferKeys<TParams['_usage']> | 'run'
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
  build(): Stage<
    TParams['_output'] extends UnsetMarker ? TParams['_input'] : TParams['_output'],
    StageConfig<TParams['_output'] extends UnsetMarker ? TParams['_input'] : TParams['_output']>
  >
  _def: BuilderDef<TParams['_stage']>
}

export type CustomRun<$P1> = (
  this: $P1 extends StageObject ? $P1 : never,
  p1?: ComplexError | $P1 | undefined,
  p2?: $P1 | undefined,
  p3?: CallbackFunction<$P1> | undefined,
) => Promise<$P1> | $P1 | void

export type Rescue<$P1> = (
  this: $P1 extends StageObject ? $P1 : never,
  p1?: Error | $P1 | undefined,
  p2?: $P1 | undefined,
  p3?: CallbackFunction<$P1> | undefined,
) => Promise<$P1> | $P1 | void

export type Ensure<$P1> = (
  p1?: $P1 extends StageObject ? $P1 : never,
  p2?: CallbackFunction<$P1> | undefined,
) => Promise<$P1> | $P1 | void

export type ValidateFn<$P1> = (
  this: $P1 extends StageObject ? $P1 : never,
  p1?: $P1 | undefined,
  p2?: CallbackFunction<boolean> | undefined,
) => Promise<boolean> | boolean | void

export type Compile<TStage> = (
  this: TStage extends Stage<infer $P, any> ? StageRun<$P> : never,
  rebuild?: boolean,
) => TStage extends Stage<infer $P, any> ? StageRun<$P> : never

export type Precompile<$P1, TStage> = (
  this: TStage extends Stage<$P1> ? TStage : never,
) => void

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
