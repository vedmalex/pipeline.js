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

type OverwriteIfDefined<TType, TWith> = UnsetMarker extends TType ? TWith
  : Simplify<TType & TWith>

export interface BuilderParams {
  _stage: unknown
  _input: unknown
  _output: unknown
  _usage: {}
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
export type inferContext<TStage> = TStage extends Stage<infer $Input, any> ? $Input : UnsetMarker

export function createBuilder<TStage extends Stage<any>>(
  _def: Partial<BuilderDef<TStage>> = {},
): Builder<{
  _stage: TStage
  _input: UnsetMarker
  _output: UnsetMarker
  _usage: {}
}> {
  return {
    _def: _def as BuilderDef<TStage>,
    input(schema) {
      return createBuilder({
        ..._def,
        inputs: schema,
      }) as any
    },
    output(schema) {
      return createBuilder({
        ..._def,
        outputs: schema,
      }) as any
    },
    run(fn) {
      if (!_def.cfg) {
        _def.cfg = {} as InferConfig<TStage>
      }
      if (fn && isRunPipelineFunction(fn)) {
        _def.cfg.run = fn as any
      } else {
        throw CreateError('run should be a `RunPipelineFunction`')
      }
      return createBuilder({
        ..._def,
      }) as any
    },
    name(name) {
      if (!_def.cfg) {
        _def.cfg = {} as InferConfig<TStage>
      }
      _def.cfg.name = name
      return createBuilder({
        ..._def,
      }) as any
    },
    rescue(rescue) {
      if (!_def.cfg) {
        _def.cfg = {} as InferConfig<TStage>
      }
      _def.cfg.rescue = rescue as any
      return createBuilder({
        ..._def,
      }) as any
    },
    ensure(ensure) {
      if (!_def.cfg) {
        _def.cfg = {} as InferConfig<TStage>
      }
      _def.cfg.ensure = ensure as any
      return createBuilder({
        ..._def,
      }) as any
    },
    validate(ensure) {
      if (!_def.cfg) {
        _def.cfg = {} as InferConfig<TStage>
      }
      _def.cfg.ensure = ensure as any
      return createBuilder({
        ..._def,
      }) as any
    },
    compile(fn) {
      if (!_def.cfg) {
        _def.cfg = {} as InferConfig<TStage>
      }
      _def.cfg.compile = fn as any
      return createBuilder({
        ..._def,
      }) as any
    },
    precompile(fn) {
      if (!_def.cfg) {
        _def.cfg = {} as InferConfig<TStage>
      }
      _def.cfg.precompile = fn as any
      return createBuilder({
        ..._def,
      }) as any
    },
  }
}

export type ParserZod<TInput, TParsedInput> = {
  _input: TInput
  _output: TParsedInput
}

export type Parser = ParserZod<any, any>

export type inferParser<TParser extends Parser> = TParser extends ParserZod<infer $TIn, infer $TOut> ? {
    in: $TIn
    out: $TOut
  }
  : UnsetMarker

type ErrorMessage<TMessage extends string> = TMessage

type InferKeys<T> = T extends object ? keyof T : never

export interface Builder<TParams extends BuilderParams> {
  /**
   * input for stage
   * @param schema only object allowed
   */
  input<$Parser extends Parser>(
    schema: TParams['_input'] extends UnsetMarker ? $Parser
      : inferParser<$Parser>['out'] extends Record<string, unknown> | undefined
        ? TParams['_input'] extends Record<string, unknown> | undefined ? undefined extends inferParser<$Parser>['out'] // if current is optional the previous must be too
            ? undefined extends TParams['_input'] ? $Parser
            : ErrorMessage<'Cannot chain an optional parser to a required parser'>
          : $Parser
        : ErrorMessage<'All input parsers did not resolve to an object'>
      : ErrorMessage<'All input parsers did not resolve to an object'>,
  ): Omit<Builder<{
    _stage: TParams['_stage']
    _input: OverwriteIfDefined<
      TParams['_input'],
      inferParser<$Parser>['in']
    >
    _output: TParams['_output']
    _usage: TParams['_usage'] & {
      input: true
    }
  }>,  InferKeys<TParams['_usage']> | 'input'>
  /**
   * output of stage
   * @param schema only object allowed
   */
  output<$Parser extends Parser>(
    schema: TParams['_input'] extends UnsetMarker ? $Parser
      : inferParser<$Parser>['out'] extends Record<string, unknown> | undefined
        ? TParams['_input'] extends Record<string, unknown> | undefined ? undefined extends inferParser<$Parser>['out'] // if current is optional the previous must be too
            ? undefined extends TParams['_input'] ? $Parser
            : ErrorMessage<'Cannot chain an optional parser to a required parser'>
          : $Parser
        : ErrorMessage<'All input parsers did not resolve to an object'>
      : ErrorMessage<'All input parsers did not resolve to an object'>,
  ): Omit<Builder<{
    _stage: TParams['_stage']
    _input: TParams['_input']
    _output: OverwriteIfDefined<
      TParams['_output'],
      inferParser<$Parser>['in']
    >
    _usage: TParams['_usage'] & {
      output: true
    }
  }>, InferKeys<TParams['_usage']> | 'ouput'>
  run<$Input = TParams['_input']>(fn: CustomRun<$Input>): Omit<Builder<{
    _stage: TParams['_stage']
    _input: TParams['_input']
    _output: TParams['_output']
    _usage: TParams['_usage'] & {
      run: true
    }
  }>, InferKeys<TParams['_usage']> | 'run'>
  name(name: string): Omit<Builder<{
    _stage: TParams['_stage']
    _input: TParams['_input']
    _output: TParams['_output']
    _usage: TParams['_usage'] & {
      name: true
    }
  }>,InferKeys<TParams['_usage']> | 'name'>
  rescue(rescue: Rescue<TParams['_input']>): Omit<Builder<{
    _stage: TParams['_stage']
    _input: TParams['_input']
    _output: TParams['_output']
    _usage: TParams['_usage'] & {
      rescue: true
    }
  }>,InferKeys<TParams['_usage']> |  'rescue'>
  ensure(ensure: Ensure<TParams['_input']>): Omit<Builder<{
    _stage: TParams['_stage']
    _input: TParams['_input']
    _output: TParams['_output']
    _usage: TParams['_usage'] & {
      ensure: true
    }
  }>, InferKeys<TParams['_usage']> | 'ensure'>
  validate(fn: ValidateFn<TParams['_input']>): Omit<Builder<{
    _stage: TParams['_stage']
    _input: TParams['_input']
    _output: TParams['_output']
    _usage: TParams['_usage'] & {
      validate: true
    }
  }>, InferKeys<TParams['_usage']> | 'validate'>
  compile(fn: Compile<TParams['_input']>): Omit<Builder<{
    _stage: TParams['_stage']
    _input: TParams['_input']
    _output: TParams['_output']
    _usage: TParams['_usage'] & {
      compile: true
    }
  }>,InferKeys<TParams['_usage']> | 'compile'>
  precompile(fn: Precompile<TParams['_input'], TParams['_stage']>): Omit<Builder<{
    _stage: TParams['_stage']
    _input: TParams['_input']
    _output: TParams['_output']
    _usage: TParams['_usage'] & {
      precompile: true
    }
  }>,InferKeys<TParams['_usage']> | 'precompile'>
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

createBuilder()
  .input(z.object({}))
  .name('stage')
  .rescue(function (err, ctx) {
    ctx
  })
  .ensure((ctx, done) => {
    return ctx ?? ctx
  })
  .run(function () {
    this
  })
