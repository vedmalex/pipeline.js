import { z } from 'zod'
import { AbstractStage, BuilderParams } from './base'
import { EmptyBuilder } from './empty'
import { IfElseBuilder } from './ifelse'
import { RescueBuilder } from './rescue'
import { Stage, StageBuilder, StageConfig } from './stage'
import { TimeoutBuilder } from './timeout'
import { WrapBuilder } from './wrap'

export const unsetMarker = Symbol('unset')
export type UnsetMarker = typeof unsetMarker

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
export type GetStage<T extends StageType, TParams extends BuilderParams> = T extends 'stage' ? StageBuilder<TParams>
  : T extends 'rescue' ? RescueBuilder<TParams>
  : T extends 'wrap' ? WrapBuilder<TParams>
  : T extends 'empty' ? EmptyBuilder
  : T extends 'timeout' ? TimeoutBuilder<TParams>
  : T extends 'ifelse' ? IfElseBuilder<TParams>
  : ErrorMessage<'not implemented'>

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
> = {
  _type: TParams['_type']
  _input: TParams['_input']
  _output: TParams['_output']
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

export type StageType = keyof IntelliSence

export type IntelliSence = {
  'builder': {
    'all': 'type'
    'start': 'type'
    'type': ''
  }
  'stage': {
    'all': 'input' | 'output' | 'run' | 'build'
    'start': 'input'
    'input': 'output' | 'run'
    'output': 'run'
    'run': 'build'
  }
  'rescue': {
    'all': 'stage' | 'rescue' | 'build'
    'start': 'stage'
    'stage': 'rescue'
    'rescue': 'build'
  }
  'wrap': {
    'all': 'input' | 'output' | 'stage' | 'prepare' | 'finalize' | 'build'
    'start': 'input'
    'input': 'output' | 'stage' // output не обязательный если это так, тогда и не нужно finalize
    'output': 'stage'
    'stage': 'prepare'
    'prepare': 'finalize' | 'build'
    'finalize': 'build'
  }
  'empty': {
    'all': 'build'
    'start': 'build'
  }
  'timeout': {
    'all': 'stage' | 'timeout' | 'overdue' | 'build'
    'start': 'stage'
    'stage': 'timeout' | 'overdue'
    'timeout': 'overdue' | 'build'
    'overdue': 'build'
  }
  'ifelse': {
    'all': 'input' | 'output' | 'truthy' | 'falsy' | 'condition' | 'build'
    'start': 'input'
    'input': 'output' | 'condition' | 'truthy'
    'output': 'condition' | 'truthy'
    'condition': 'truthy'
    'truthy': 'falsy' | 'build'
    'falsy': 'build'
  }
  'retry': {}
  'dowhile': {}
  'multiwayswitch': {}
  'parallel': {}
  'sequential': {}
}
export type GetIntellisenceFor<Stage extends keyof IntelliSence, State extends keyof IntelliSence[Stage]> =
  IntelliSence[Stage][State]
export type PropertiesFor<T extends StageType, kind extends 'all' | 'start'> = T extends 'stage'
  ? GetIntellisenceFor<'stage', kind>
  : T extends 'rescue' ? GetIntellisenceFor<'rescue', kind>
  : T extends 'wrap' ? GetIntellisenceFor<'wrap', kind>
  : T extends 'emtpy' ? GetIntellisenceFor<'empty', kind>
  : T extends 'timeout' ? GetIntellisenceFor<'timeout', kind>
  : T extends 'ifelse' ? GetIntellisenceFor<'ifelse', kind>
  : ErrorMessage<'not implemented'>
export type AllPropertiesFor<T extends StageType> = PropertiesFor<T, 'all'>
export type StartFor<T extends StageType> = PropertiesFor<T, 'start'>
export type HiddenIntellisenceFor<Stage extends StageType, Property extends keyof IntelliSence[Stage]> = Exclude<
  AllPropertiesFor<Stage> | Property,
  GetIntellisenceFor<Stage, Property>
>
export type IntellisenseFor<Stage extends StageType, Property extends keyof IntelliSence[Stage], Type> = Omit<
  Type,
  HiddenIntellisenceFor<Stage, Property>
>
