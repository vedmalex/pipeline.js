import { z } from 'zod'
import { AnyStage, BaseStageConfig, validatorBaseStageConfig, validatorRunConfig } from '../../stage'
import { AbstractStage } from '../../stage/AbstractStage'

export type RescueRun<Input, Output> = (err: Error | undefined, ctx: Input) => Promise<Output> | Output

export interface RescueConfig<Input, Output> extends BaseStageConfig<Input, Output> {
  stage: AnyStage<Input, Output>
  rescue: RescueRun<Input, Output>
}

export function validatorRescueConfig<Input, Output>(config: BaseStageConfig<Input, Output>) {
  const output: z.ZodSchema = config?.output ? config.output : z.any()
  return validatorBaseStageConfig
    .merge(validatorRunConfig(config))
    .merge(z.object({
      stage: z.instanceof(AbstractStage),
      rescue: z.function(z.tuple([z.union([z.instanceof(Error), z.undefined()])]), z.union([output.promise(), output])),
    }))
}
