import { AnyStage, StageConfig } from '../../stage'

export interface WrapConfig<Input, Output, T> extends StageConfig<Input, Output> {
  stage: AnyStage<Input, Output>
  prepare?: (ctx: Input) => T
  finalize?: (ctx: Input, retCtx: unknown) => Output
}
