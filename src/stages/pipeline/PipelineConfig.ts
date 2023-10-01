import { AnyStage, Config } from '../../stage'

export interface PipelineConfig<Input, Output> extends Config<Input, Output> {
  stages: Array<AnyStage<Input, Output>>
}
