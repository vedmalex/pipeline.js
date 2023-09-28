import { AnyStage, ComplexError, RunPipelineFunction, StageConfig } from '../../stage'

export interface RetryOnErrorConfig<Input, Output, T> extends StageConfig<Input, Output> {
  stage?: AnyStage<Input, Output> | RunPipelineFunction<Input, Output>
  retry?: number | (<T>(p1?: ComplexError, p2?: T, p3?: number) => boolean)
  backup?: (ctx: Input) => T
  restore?: (ctx: Input, backup: T) => Input
}
