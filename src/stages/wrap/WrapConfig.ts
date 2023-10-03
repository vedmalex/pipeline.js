import { z } from 'zod'
import { StageConfig, validatorBaseStageConfig, validatorRunConfig } from '../../stage'
import { AbstractStage } from '../../stage/AbstractStage'

export type WrapPrepare<Input, IInput> = (
  ctx: Input,
) => Promise<IInput> | IInput
export type WrapFinalize<Input, Output, IOutput> = (
  ctx: Input,
  retCtx: IOutput,
) => Promise<Output> | Output

export interface WrapConfig<Input, Output, IInput, IOutput> extends StageConfig<Input, Output> {
  stage: AbstractStage<IInput, IOutput>
  prepare?: WrapPrepare<Input, IInput>
  finalize?: WrapFinalize<Input, Output, IOutput>
}

export function validatorWrapConfig<Input, Output, IInput, IOutput>(
  config: WrapConfig<Input, Output, IInput, IOutput>,
) {
  const output: z.ZodSchema = config?.output ? config.output : z.any()
  const input: z.ZodSchema = config?.input ? config.input : z.any()
  const iinput: z.ZodSchema = config?.stage.config?.input
    ? config?.stage.config?.input
    : z.any()
  const ioutput: z.ZodSchema = config?.stage.config?.output
    ? config?.stage.config?.output
    : z.any()
  return validatorBaseStageConfig
    .merge(validatorRunConfig(config))
    .merge(z.object({
      stage: z.instanceof(AbstractStage),
      prepare: z.function(z.tuple([input]), z.union([iinput.promise(), iinput]))
        .optional(),
      finalize: z.function(z.tuple([input, ioutput]), z.union([output.promise(), output])).optional(),
    }))
}
