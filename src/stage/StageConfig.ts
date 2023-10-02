import z from 'zod'

// включить тип для вычисления параметра
export type BaseStageConfig<Input, Output> = {
  input?: z.ZodType<Input>
  output?: z.ZodType<Output>
}

export type Run<Input, Output> = (input: Input) => Promise<Output> | Output

export type RunConfig<Input, Output> = {
  run: Run<Input, Output>
}

export type StageConfig<Input, Output> = BaseStageConfig<Input, Output> & RunConfig<Input, Output>

export const validatorBaseStageConfig = z.object({
  input: z.instanceof(z.ZodType).optional(),
  output: z.instanceof(z.ZodType).optional(),
})

export function validatorStageConfig<Input, Output>(config: StageConfig<Input, Output>) {
  return validatorBaseStageConfig.merge(validatorRunConfig(config))
}

export function validatorRun<Input, Output>(_input?: z.ZodSchema, _output?: z.ZodSchema) {
  const input: z.ZodSchema = _input ? _input : z.any()
  const output: z.ZodSchema = _output ? _output : z.any()
  return z.function(z.tuple([input]), z.union([output.promise(), output]))
}

export function validatorRunConfig<Input, Output>(config?: BaseStageConfig<Input, Output>) {
  const input: z.ZodSchema = config?.input ? config.input : z.any()
  const output: z.ZodSchema = config?.output ? config.output : z.any()
  return z.object({
    run: validatorRun(input, output),
  })
}
