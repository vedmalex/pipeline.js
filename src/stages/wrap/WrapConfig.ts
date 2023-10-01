import { AnyStage, Config } from '../../stage'

export interface WrapConfig<Input, Output, T> extends Config<Input, Output> {
  stage: AnyStage<Input, Output>
  prepare?: (ctx: Input) => T
  finalize?: (ctx: Input, retCtx: unknown) => Output
}
