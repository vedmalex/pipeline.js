import 'jest'
import z from 'zod'
import { validatorRunConfig } from '../base'
import { validatorBaseStageConfig } from '../base'
import { Run } from '../base'

describe('ValidatorStageConfig', () => {
  it('check input types', () => {
    const res = validatorBaseStageConfig.safeParse({
      input: z.object({}),
      output: z.string(),
    })
    expect(res.success).toBeTruthy()
  })
  it('throws on invalid input types', () => {
    const res = validatorBaseStageConfig.safeParse({
      input: {},
      output: 10,
    })
    expect(res.success).toBeFalsy()
  })
})

describe('ValidateRunConfig', () => {
  const input = z.object({ age: z.number() })
  const output = z.number()
  type Input = z.infer<typeof input>
  type Output = z.infer<typeof output>
  type FnRun = Run<Input, Output>
  function prepare(fn: FnRun) {
    return validatorRunConfig({
      input,
      output,
    })
      .safeParse({
        run: fn,
      })
  }
  it('valid promise', async () => {
    const result = prepare(ctx => {
      return Promise.resolve(ctx.age)
    })
    expect(result.success).toBeTruthy()
    if (result.success) {
      const res = await result.data.run({ age: 10 })
      expect(res).toBe(10)
    }
  })
  it('valid result', async () => {
    const result = prepare(ctx => {
      return ctx.age
    })
    expect(result.success).toBeTruthy()
    if (result.success) {
      const res = await result.data.run({ age: 10 })
      expect(res).toBe(10)
    }
  })

  it('throw on invalid result', async () => {
    const result = prepare(ctx => {
      return ctx.age
    })
    expect(result.success).toBeTruthy()
    if (result.success) {
      expect(() => result.data.run({ age: '10' })).toThrow()
    }
  })

  it('throw on invalid input', async () => {
    const result = prepare(ctx => {
      return ctx.age
    })
    expect(result.success).toBeTruthy()
    if (result.success) {
      expect(() => result.data.run(10)).toThrow()
    }
  })
})
