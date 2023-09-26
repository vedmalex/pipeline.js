import {z} from 'zod'
import { StageConfig } from './StageConfig'
import { CallbackFunction, StageObject } from './types';
import { ComplexError } from './errors';

export const unsetMarker = Symbol('unset')

export type UnsetMarker = typeof unsetMarker

/**
 * @internal
 * @see https://github.com/ianstormtaylor/superstruct/blob/7973400cd04d8ad92bbdc2b6f35acbfb3c934079/src/utils.ts#L323-L325
 */
export type Simplify<TType> = TType extends any[] | Date
  ? TType
  : { [K in keyof TType]: TType[K] };


type OverwriteIfDefined<TType, TWith> = UnsetMarker extends TType
  ? TWith
  : Simplify<TType & TWith>;

export interface BuilderParams<
  TConfig = unknown,
  > {
  _config: TConfig
  _input: unknown
  _output: unknown
}

export type AnyStageConfig = StageConfig<any>

export type BuilderDef<TInput> = {
  inputs: Parser
  outputs: Parser
  cfg: AnyStageConfig
}

export function createBuilder<TInput extends StageObject, TConfig extends StageConfig<TInput>>(
  _def: Partial<BuilderDef<TInput>> = {},
): Builder<{
  _config: TConfig,
  _input: UnsetMarker,
  _output: UnsetMarker,
}> {
  return {
    _def: _def as BuilderDef<TInput>,
    input(schema) {
      return createBuilder(
        {
          ..._def,
        inputs: schema,
        },
      ) as any
    },
    output(schema) {
      return createBuilder(
        {
          ..._def,
        outputs: schema,
        },
      ) as any
    },
    run(fn) {
      if (!_def.cfg) {
        _def.cfg = {} as TConfig
      }

      _def.cfg.run = fn as any
      return createBuilder(
        {
          ..._def,
        },
      ) as any
    },
  }
}

export type ParserZod<TInput, TParsedInput> = {
  _input: TInput;
  _output: TParsedInput;
};

export type Parser = ParserZod<any, any>

export type inferParser<TParser extends Parser> =
  TParser extends ParserZod<infer $TIn, infer $TOut>
    ? {
        in: $TIn;
        out: $TOut;
      }
    : never;

type ErrorMessage<TMessage extends string> = TMessage;


export interface Builder<TParams extends BuilderParams> {
  /**
   * input for stage
   * @param schema only object allowed
   */
  input<$Parser extends Parser>(
   schema:TParams['_input'] extends UnsetMarker
      ? $Parser
      : inferParser<$Parser>['out'] extends Record<string, unknown> | undefined
      ? TParams['_input'] extends Record<string, unknown> | undefined
        ? undefined extends inferParser<$Parser>['out'] // if current is optional the previous must be too
          ? undefined extends TParams['_input']
            ? $Parser
            : ErrorMessage<'Cannot chain an optional parser to a required parser'>
          : $Parser
        : ErrorMessage<'All input parsers did not resolve to an object'>
      : ErrorMessage<'All input parsers did not resolve to an object'>,
    ): Builder<{
      _config: TParams['_config']
      _input: OverwriteIfDefined<
        TParams['_input'],
        inferParser<$Parser>['in']
      >
      _output: TParams['_output']
    }>
  /**
   * output of stage
   * @param schema only object allowed
   */
  output<$Parser extends Parser>(
   schema:TParams['_output'] extends UnsetMarker
      ? $Parser
      : inferParser<$Parser>['out'] extends Record<string, unknown> | undefined
      ? TParams['_output'] extends Record<string, unknown> | undefined
        ? undefined extends inferParser<$Parser>['out'] // if current is optional the previous must be too
          ? undefined extends TParams['_output']
            ? $Parser
            : ErrorMessage<'Cannot chain an optional parser to a required parser'>
          : $Parser
        : ErrorMessage<'All input parsers did not resolve to an object1'>
      : ErrorMessage<'All input parsers did not resolve to an object2'>,
    ): Builder<{
    _config: TParams['_config']
    _input: TParams['_input']
    _output: OverwriteIfDefined<
      TParams['_output'],
      inferParser<$Parser>['in']
    >
    }>
  run<$Input = TParams['_input']>(fn: CustomRun<$Input>):Builder<{
    _config: TParams['_config']
    _input: TParams['_input']
    _output: TParams['_output'],
    }>
  _def: BuilderDef<TParams['_input']>
}

export type CustomRun<$P1> = (
  this: $P1 | undefined,
  p1?: ComplexError | $P1 | undefined,
  p2?: $P1 | undefined,
  p3?: CallbackFunction<$P1> | undefined,
) => Promise<$P1> | void

const p = createBuilder()
  .input(z.object({ name: z.string() }))
  .run(function () {
  })