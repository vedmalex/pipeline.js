import z from 'zod'
import {
  AbstractStage,
  BuilderParams,
  DoWhileParams,
  IfElseParams,
  MultiWaySwitchCaseParams,
  MultiWaySwitchParams,
  PipelineParams,
  RescueParams,
  RetryOnErrorParams,
  SequentialParams,
  StageParams,
  TimeoutParams,
  WithInputOutputParams,
  WithInputParams,
  WrapParams,
} from './base'
import { Stage, StageConfig } from './stage'

export const unsetMarker = Symbol('unset')
export type UnsetMarker = typeof unsetMarker
// export type UnsetMarker = unknown

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
// type CT = Merge<{name: string, id: string} , {id: string| undefined, region:string}>

export type MergeIfDefined<TType, TWith> = UnsetMarker extends TType ? TWith
  : Simplify<TType & TWith>

// export type MergeIfDefined<TType, TWith> = UnsetMarker extends TType ? TWith
//   : Merge<TType, TWith>

export type OverwriteIfDefined<TType, TWith> = UnsetMarker extends TType ? TWith
  : TType
/**
 * @internal
 * @see https://github.com/ianstormtaylor/superstruct/blob/7973400cd04d8ad92bbdc2b6f35acbfb3c934079/src/utils.ts#L323-L325
 */

export type Simplify<TType> = {
  [K in keyof TType]: TType[K]
}

export type ExtractInput<TParams> = TParams extends WithInputParams ? TParams['_input']
  : UnsetMarker

export type MaySetInput<TParams> = OverwriteIfDefined<ExtractInput<TParams>, any>
export type MaySetOutput<TParams> = OverwriteIfDefined<ExtractOutput<TParams>, any>

export type ExtractOutput<TParams> = TParams extends WithInputOutputParams
  ? TParams['_output'] extends UnsetMarker ? TParams['_input'] extends UnsetMarker ? any : TParams['_input']
  : TParams['_output']
  : UnsetMarker

// упрощает работу с chain

export type InferBuilderParams<
  TParams extends BuilderParams,
> = {
  _type: TParams['_type']
}

export type InferStageParams<
  TParams extends BuilderParams,
> = TParams extends StageParams ? {
    _type: TParams['_type']
    _input: TParams['_input']
    _output: TParams['_output']
    _run: TParams['_run']
  }
  : {
    _type: TParams['_type']
    _input: UnsetMarker
    _output: UnsetMarker
    _run: UnsetMarker
  }

export type InferRescueParams<
  TParams extends BuilderParams,
> = TParams extends RescueParams ? {
    _type: TParams['_type']
    _input: TParams['_input']
    _output: TParams['_output']
    _stage: TParams['_stage']
  }
  : {
    _type: TParams['_type']
    _input: UnsetMarker
    _output: UnsetMarker
    _stage: UnsetMarker
  }

export type InferWrapParams<
  TParams extends BuilderParams,
> = TParams extends WrapParams ? {
    _type: TParams['_type']
    _input: TParams['_input']
    _output: TParams['_output']
    _stage: TParams['_stage']
    _prepare: TParams['_prepare']
    _finalize: TParams['_finalize']
  }
  : {
    _type: TParams['_type']
    _input: UnsetMarker
    _output: UnsetMarker
    _stage: UnsetMarker
    _prepare: UnsetMarker
    _finalize: UnsetMarker
  }

export type InferTimeoutParams<
  TParams extends BuilderParams,
> = TParams extends TimeoutParams ? {
    _type: TParams['_type']
    _input: TParams['_input']
    _output: TParams['_output']
    _stage: TParams['_stage']
    _timeout: TParams['_timeout']
  }
  : {
    _type: TParams['_type']
    _input: UnsetMarker
    _output: UnsetMarker
    _stage: UnsetMarker
    _timeout: UnsetMarker
  }

export type InferIfElseParams<
  TParams extends BuilderParams,
> = TParams extends IfElseParams ? {
    _type: TParams['_type']
    _stage: TParams['_stage']
    _input: TParams['_input']
    _output: TParams['_output']
    _if: TParams['_if']
    _then: TParams['_then']
    _else: TParams['_else']
  }
  : {
    _type: TParams['_type']
    _stage: UnsetMarker
    _input: UnsetMarker
    _output: UnsetMarker
    _if: UnsetMarker
    _then: UnsetMarker
    _else: UnsetMarker
  }

export type InferRetryOnErrorParams<
  TParams extends BuilderParams,
> = TParams extends RetryOnErrorParams ? {
    _type: TParams['_type']
    _input: TParams['_input']
    _output: TParams['_output']
    _stage: TParams['_stage']
    _retry: TParams['_retry']
    _backup: TParams['_backup']
    _restore: TParams['_restore']
    _storage: TParams['_storage']
  }
  : {
    _type: TParams['_type']
    _input: UnsetMarker
    _output: UnsetMarker
    _stage: UnsetMarker
    _retry: UnsetMarker
    _backup: UnsetMarker
    _restore: UnsetMarker
    _storage: UnsetMarker
  }

export type InferDoWhileParams<
  TParams extends BuilderParams,
> = TParams extends DoWhileParams ? {
    _type: TParams['_type']
    _input: TParams['_input']
    _output: TParams['_output']
    _stage: TParams['_stage']
    _step: TParams['_step']
    _combine: TParams['_combine']
  }
  : {
    _type: TParams['_type']
    _input: UnsetMarker
    _output: UnsetMarker
    _stage: UnsetMarker
    _step: UnsetMarker
    _combine: UnsetMarker
  }

export type InferPipelineParams<
  TParams extends BuilderParams,
> = TParams extends PipelineParams ? {
    _type: TParams['_type']
    _input: TParams['_input']
    _output: TParams['_output']
  }
  : {
    _type: TParams['_type']
    _input: UnsetMarker
    _output: UnsetMarker
  }

export type InferSequentialParams<
  TParams extends BuilderParams,
> = TParams extends SequentialParams ? {
    _type: TParams['_type']
    _input: TParams['_input']
    _output: TParams['_output']
    _stage: TParams['_stage']
    _serial: TParams['_serial']
  }
  : {
    _type: TParams['_type']
    _input: UnsetMarker
    _output: UnsetMarker
    _stage: UnsetMarker
    _serial: UnsetMarker
  }

export type InferMultiWaySwitchParams<
  TParams extends BuilderParams,
> = TParams extends MultiWaySwitchParams ? {
    _type: TParams['_type']
    _input: TParams['_input']
    _output: TParams['_output']
    _cases: TParams['_cases']
  }
  : {
    _type: TParams['_type']
    _input: UnsetMarker
    _output: UnsetMarker
    _cases: UnsetMarker
  }

export type InferMultiWaySwitchCaseParams<
  TParams extends BuilderParams,
> = TParams extends MultiWaySwitchCaseParams ? {
    _type: TParams['_type']
    _input: TParams['_input']
    _output: TParams['_output']
    _stage: TParams['_stage']
    _evaluate: TParams['_evaluate']
  }
  : {
    _type: TParams['_type']
    _input: UnsetMarker
    _output: UnsetMarker
    _stage: UnsetMarker
    _evaluate: UnsetMarker
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

export type IntelliSence<Exists = ''> = {
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
    'all': 'then' | 'stage' | 'else' | 'if' | 'build'
    'start': 'stage' | 'if'
    'stage': 'if'
    'if': Exclude<'then' | 'else', Exists>
    'then': 'else' | 'build'
    'else': 'build'
  }
  'retryonerror': {
    'all': 'stage' | 'retry' | 'backup' | 'restore'
    'start': 'stage'
    'stage': 'retry'
    'retry': 'backup' | 'restore' | 'build'
    'backup': 'restore'
    'restore': 'build'
  }
  'dowhile': {
    'all': 'input' | 'output' | 'start' | 'do' | 'step' | 'combine' | 'while' | 'build'
    'start': 'input'
    'input': 'output' | 'do'
    'output': 'do'
    'do': 'step'
    'step': 'combine'
    'combine': 'while'
    'while': 'build'
  }
  'pipeline': {
    'all': 'addStage' | 'build'
    'start': 'addStage'
    'addStage': 'build' | 'addStage'
  }
  'multiwayswitch': {
    'all': 'add' | 'build' | 'input' | 'output'
    'start': 'add'
    'add': 'add' | 'build'
  }
  'multiwayswitchcase': {
    'all': 'input' | 'start' | 'input' | 'output' | 'evaluate' | 'stage' | 'split' | 'combine' | 'build'
    'start': 'stage'
    'stage': 'evaluate'
    'evaluate': 'split' | 'build'
    'split': 'combine'
    'combine': 'build'
  }
  'sequential': {
    'all': 'stage' | 'build' | 'serial'
    'start': 'serial' | 'stage'
    'serial': 'stage'
    'stage': 'build'
  }
}
export type GetIntellisenceFor<Stage extends keyof IntelliSence, State extends keyof IntelliSence[Stage]> =
  IntelliSence[Stage][State]

export type PropertiesFor<T extends StageType, kind extends 'all' | 'start'> = T extends 'stage'
  ? GetIntellisenceFor<T, kind>
  : T extends 'rescue' ? GetIntellisenceFor<T, kind>
  : T extends 'wrap' ? GetIntellisenceFor<T, kind>
  : T extends 'emtpy' ? GetIntellisenceFor<T, kind>
  : T extends 'timeout' ? GetIntellisenceFor<T, kind>
  // : T extends 'ifelse' ? GetIntellisenceFor<T, kind>
  : T extends 'retryonerror' ? GetIntellisenceFor<T, kind>
  : T extends 'dowhile' ? GetIntellisenceFor<T, kind>
  : T extends 'sequential' ? GetIntellisenceFor<T, kind>
  : T extends 'multiwayswitch' ? GetIntellisenceFor<T, kind>
  : T extends 'multiwayswitchcase' ? GetIntellisenceFor<T, kind>
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
