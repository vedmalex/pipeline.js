// import { z } from 'zod'
// import { ComplexError, CreateError } from './errors'
// import { StageConfig } from './StageConfig'
// import { CallbackFunction, isRunPipelineFunction, StageObject, StageRun, UnsetMarker } from './types'
// import { Stage } from './stage'

// /**
//  * @internal
//  * @see https://github.com/ianstormtaylor/superstruct/blob/7973400cd04d8ad92bbdc2b6f35acbfb3c934079/src/utils.ts#L323-L325
//  */
// export type Simplify<TType> = TType extends any[] | Date ? TType
//   : { [K in keyof TType]: TType[K] }

// type OverwriteIfDefined<TType, TWith> = UnsetMarker extends TType ? TWith
//   : Simplify<TType & TWith>

// export interface BuilderParams<
//   TConfig = unknown,
//   TStage = unknown
//   > {
//   _stage: TStage
//   _config: TConfig
//   _input: unknown
//   _output: unknown
// }

// export type AnyStageConfig = StageConfig<any,any>

// export type BuilderDef<TConfig> = {
//   stage: unknown
//   inputs: Parser
//   outputs: Parser
//   cfg: TConfig
// }

// export type InferConfig<TStage> = TStage extends Stage<any, infer $TConfig> ? $TConfig : UnsetMarker
// export type inferContext<TStage> = TStage extends Stage<infer $Input, any> ? $Input : UnsetMarker

// export function createBuilder<TStage extends Stage<any, any>>(
//   stage: TStage,
//   _def: Partial<BuilderDef<InferConfig<TStage>>> = {},
// ): Builder<{
//   _stage: TStage
//   _config: InferConfig<TStage>
//   _input: UnsetMarker
//   _output: UnsetMarker
// }> {
//   return {
//     _def: _def as BuilderDef<InferConfig<TStage>>,
//     input(schema) {
//       return createBuilder(
//         stage,
//         {
//         ..._def,
//         inputs: schema,
//       }) as any
//     },
//     output(schema) {
//       return createBuilder(
//         stage,
//         {
//         ..._def,
//         outputs: schema,
//       }) as any
//     },
//     run(fn) {
//       if (!_def.cfg) {
//         _def.cfg = {} as InferConfig<TStage>
//       }
//       if (fn && isRunPipelineFunction(fn)) {
//         _def.cfg.run = fn as any
//       } else {
//         throw CreateError('run should be a `RunPipelineFunction`')
//       }
//       return createBuilder(
//         stage,
//         {
//         ..._def,
//       }) as any
//     },
//     name(name) {
//       if (!_def.cfg) {
//         _def.cfg = {}
//       }
//       _def.cfg.name = name
//       return createBuilder(
//         stage,
//         {
//         ..._def,
//       }) as any
//     },
//     rescue(rescue) {
//       if (!_def.cfg) {
//         _def.cfg = {}
//       }
//       _def.cfg.rescue = rescue as any
//       return createBuilder(
//         stage,
//         {
//         ..._def,
//       }) as any
//     },
//     ensure(ensure) {
//       if (!_def.cfg) {
//         _def.cfg = {}
//       }
//       _def.cfg.ensure = ensure as any
//       return createBuilder(
//         stage,
//         {
//         ..._def,
//       }) as any
//     },
//     validate(ensure) {
//       if (!_def.cfg) {
//         _def.cfg = {}
//       }
//       _def.cfg.ensure = ensure as any
//       return createBuilder(
//         stage,
//         {
//         ..._def,
//       }) as any
//     },
//     compile(fn) {
//       if (!_def.cfg) {
//         _def.cfg = {}
//       }
//       _def.cfg.compile = fn as any
//       return createBuilder(
//         stage,
//         {
//         ..._def,
//       }) as any
//     },
//     precompile(fn) {
//       if (!_def.cfg) {
//         _def.cfg = {}
//       }
//       _def.cfg.precompile = fn as any
//       return createBuilder(
//         stage,
//         {
//         ..._def,
//       }) as any
//     },
//   }
// }

// export type ParserZod<TInput, TParsedInput> = {
//   _input: TInput
//   _output: TParsedInput
// }

// export type Parser = ParserZod<any, any>

// export type inferParser<TParser extends Parser> = TParser extends ParserZod<infer $TIn, infer $TOut> ? {
//     in: $TIn
//     out: $TOut
//   }
//   : UnsetMarker

// type ErrorMessage<TMessage extends string> = TMessage

// // должен быть Stage

// export interface Builder<TParams extends BuilderParams> {
//   /**
//    * input for stage
//    * @param schema only object allowed
//    */
//   input<$Parser extends Parser>(
//     schema: TParams['_input'] extends UnsetMarker ? $Parser
//       : inferParser<$Parser>['out'] extends Record<string, unknown> | undefined
//         ? TParams['_input'] extends Record<string, unknown> | undefined ? undefined extends inferParser<$Parser>['out'] // if current is optional the previous must be too
//             ? undefined extends TParams['_input'] ? $Parser
//             : ErrorMessage<'Cannot chain an optional parser to a required parser'>
//           : $Parser
//         : ErrorMessage<'All input parsers did not resolve to an object'>
//       : ErrorMessage<'All input parsers did not resolve to an object'>,
//   ): Builder<{
//     _stage: TParams['_stage']
//     _config: TParams['_config']
//     _input: OverwriteIfDefined<
//       TParams['_input'],
//       inferParser<$Parser>['in']
//     >
//     _output: TParams['_output']
//   }>
//   /**
//    * output of stage
//    * @param schema only object allowed
//    */
//   output<$Parser extends Parser>(
//     schema: TParams['_output'] extends UnsetMarker ? $Parser
//       : inferParser<$Parser>['out'] extends Record<string, unknown> | undefined
//         ? TParams['_output'] extends Record<string, unknown> | undefined ? undefined extends inferParser<$Parser>['out'] // if current is optional the previous must be too
//             ? undefined extends TParams['_output'] ? $Parser
//             : ErrorMessage<'Cannot chain an optional parser to a required parser'>
//           : $Parser
//         : ErrorMessage<'All input parsers did not resolve to an object1'>
//       : ErrorMessage<'All input parsers did not resolve to an object2'>,
//   ): Builder<{
//     _stage: TParams['_stage']
//     _config: TParams['_config']
//     _input: TParams['_input']
//     _output: OverwriteIfDefined<
//       TParams['_output'],
//       inferParser<$Parser>['in']
//     >
//   }>
//   run<$Input = TParams['_input']>(fn: CustomRun<$Input>): Builder<{
//     _stage: TParams['_stage']
//     _config: TParams['_config']
//     _input: TParams['_input']
//     _output: TParams['_output']
//   }>
//   name(name:string):Builder<{
//     _stage: TParams['_stage']
//     _config: TParams['_config']
//     _input: TParams['_input']
//     _output: TParams['_output']
//   }>
//   rescue(rescue:Rescue<TParams['_input']>):Builder<{
//     _stage: TParams['_stage']
//     _config: TParams['_config']
//     _input: TParams['_input']
//     _output: TParams['_output']
//   }>
//   ensure(ensure: Ensure<TParams['_input']>):Builder<{
//     _stage: TParams['_stage']
//     _config: TParams['_config']
//     _input: TParams['_input']
//     _output: TParams['_output']
//   }>
//   validate(fn: ValidateFn<TParams['_input']>):Builder<{
//     _stage: TParams['_stage']
//     _config: TParams['_config']
//     _input: TParams['_input']
//     _output: TParams['_output']
//   }>
//   compile(fn: Compile<TParams['_input']>):Builder<{
//     _stage: TParams['_stage']
//     _config: TParams['_config']
//     _input: TParams['_input']
//     _output: TParams['_output']
//   }>
//   precompile(fn: Precompile<TParams['_input']>):Builder<{
//     _stage: TParams['_stage']
//     _config: TParams['_config']
//     _input: TParams['_input']
//     _output: TParams['_output']
//   }>
//   _def: BuilderDef
// }

// export type CustomRun<$P1> = (
//   this: $P1 | undefined,
//   p1?: ComplexError | $P1 | undefined,
//   p2?: $P1 | undefined,
//   p3?: CallbackFunction<$P1> | undefined,
// ) => Promise<$P1> | $P1 | void

// export type Rescue<$P1> = (
//   this: $P1  | null,
//   p1?: Error | $P1 | undefined,
//   p2?: $P1 | undefined,
//   p3?: CallbackFunction<$P1> | undefined,
// ) => Promise<$P1> | $P1 | void

// export type Ensure<$P1> = (
//   p1?: $P1 | undefined,
//   p2?: CallbackFunction<$P1> | undefined,
// ) => Promise<$P1> | $P1 | void

// export type ValidateFn<$P1> = (
//   this: $P1  | null,
//   p1?: $P1 | undefined,
//   p2?: CallbackFunction<boolean> | undefined,
// ) => Promise<boolean> | boolean | void

// export type Compile<TStage> = (this: TStage, rebuild?: boolean) => TStage extends Stage<infer $P,any> ? StageRun<$P>:UnsetMarker

// export type Precompile<$P1, TStage extends Stage<$P1 extends StageObject ? $P1 : UnsetMarker, $P2 extends StageConfig<$P1, $P2>> = (
//   this: TStage
// ) => void

// createBuilder(new Stage())
//   .input(z.object({ name: z.string() }))
//   .name("stage")
//   .rescue(function(err, ctx) {
//     this?.name
//   })
//   .ensure(() => {
//     return
//   })
//   .run(function () {
//   })