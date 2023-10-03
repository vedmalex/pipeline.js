import { z } from 'zod'
import { BuilderParams, EmptyBuilder, RescueBuilder, StageBuilder, StageType, WrapBuilder } from './types'

import { Stage, StageConfig, UnsetMarker } from '../stage'
import { AbstractStage } from '../stage/AbstractStage'

export type Merge<S, D> = Simplify<
  & {
    [K in keyof S]: K extends keyof D ? UnsetMarker extends D[K] ? S[K] : D[K]
      : S[K]
  }
  & {
    [K in keyof D]: K extends keyof S ? UnsetMarker extends S[K] ? D[K] : S[K]
      : D[K]
  }
>
export type OverwriteIfDefined<TType, TWith> = UnsetMarker extends TType ? TWith
  : Simplify<TType & TWith>
/**
 * @internal
 * @see https://github.com/ianstormtaylor/superstruct/blob/7973400cd04d8ad92bbdc2b6f35acbfb3c934079/src/utils.ts#L323-L325
 */

export type Simplify<TType> = TType extends any[] | Date ? TType : {
  [K in keyof TType]: TType[K]
}
export type GetStage<T extends StageType, TParams> = TParams extends BuilderParams
  ? T extends 'stage' ? StageBuilder<TParams>
  : T extends 'rescue' ? RescueBuilder<TParams>
  : T extends 'wrap' ? WrapBuilder<TParams>
  : T extends 'empty' ? EmptyBuilder
  : never
  : never

export type ExtractInput<TParams> = TParams extends BuilderParams
  ? TParams['_input'] extends UnsetMarker ? TParams['_output'] extends UnsetMarker ? any : TParams['_output']
  : TParams['_input']
  : UnsetMarker

export type ExtractOutput<TParams> = TParams extends BuilderParams
  ? TParams['_output'] extends UnsetMarker ? TParams['_input'] extends UnsetMarker ? any : TParams['_input']
  : TParams['_output']
  : UnsetMarker

export type ExtractWrapeeInput<TParams> = TParams extends BuilderParams
  ? TParams['_wrapee_input'] extends UnsetMarker
    ? TParams['_wrapee_output'] extends UnsetMarker ? any : TParams['_wrapee_output']
  : TParams['_wrapee_input']
  : ExtractInput<TParams>

export type ExtractWrapeeOutput<TParams> = TParams extends BuilderParams
  ? TParams['_wrapee_output'] extends UnsetMarker
    ? TParams['_wrapee_input'] extends UnsetMarker ? any : TParams['_wrapee_input']
  : TParams['_wrapee_output']
  : ExtractOutput<TParams>

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
  _wrapee_input: TParams['_wrapee_input']
  _wrapee_output: TParams['_wrapee_output']
}
export type ParserZod<TInput, TParsedInput> = {
  _input: TInput
  _output: TParsedInput
}
export type ErrorMessage<TMessage extends string> = TMessage
// берет тип на основании трёх параметров
//
export type SchemaType<
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
export type Parser = z.ZodTypeAny
export type InferConfig<TStage> = TStage extends Stage<any, any, infer $TConfig> ? $TConfig
  : TStage extends Stage<infer $Input, infer $Output, any> ? StageConfig<$Input, $Output>
  : {}
export type InferContext<TStage> = TStage extends Stage<infer $Input, any> ? $Input
  : UnsetMarker

export type inferParser<TParser extends Parser> = TParser extends ParserZod<infer $TIn, infer $TOut> ? {
    in: $TIn
    out: $TOut
  }
  : UnsetMarker

export type ExtractStage<TStage> = TStage extends AbstractStage<any, any> ? TStage
  : UnsetMarker

export type ExtractStageInput<TStage> = TStage extends AbstractStage<infer $Input, any> ? $Input
  : UnsetMarker

export type ExtractStageOutput<TStage> = TStage extends AbstractStage<any, infer $Output> ? $Output : UnsetMarker
