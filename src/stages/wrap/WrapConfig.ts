import { AllowedStageStored, Config } from '../../stage'

export interface WrapConfig<Input, Output, T> extends Config<Input, Output> {
  stage: AllowedStageStored<Input, Output, Config<Input, Output>>
  prepare?: (ctx: Input) => T
  finalize?:
    | ((ctx: Input, retCtx: unknown) => Output)
    | ((ctx: Input | Output, retCtx: unknown) => void)
}
