import { AllowedStageStored, StageConfig } from '../../stage'

export interface WrapConfig<Input, Output, T> extends StageConfig<Input, Output> {
  stage: AllowedStageStored<Input, Output, StageConfig<Input, Output>>
  prepare?: (ctx: Input) => T
  finalize?:
    | ((ctx: Input, retCtx: unknown) => Output)
    | ((ctx: Input | Output, retCtx: unknown) => void)
}
