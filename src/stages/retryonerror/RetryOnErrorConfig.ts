import { AnyStage, ComplexError, RunPipelineFunction, StageConfig } from '../../stage'

export interface RetryOnErrorConfig<R, T> extends StageConfig<R> {
  stage?: AnyStage<R> | RunPipelineFunction<R>
  retry?: number | (<T>(p1?: ComplexError, p2?: T, p3?: number) => boolean)
  backup?: (ctx: R) => T
  restore?: ((ctx: R, backup: T) => R) | ((ctx: R, backup: T) => void)
}
