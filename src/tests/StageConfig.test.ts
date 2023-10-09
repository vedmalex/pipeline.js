import 'jest'
import z from 'zod'
import { validatorRunConfig } from '../base'
import { validatorBaseStageConfig } from '../base'
import { FnRun } from '../base'

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
  type Fn = FnRun<Input, Output>
  function prepare(fn: Fn) {
    return validatorRunConfig({
      input,
      output,
    })
      .safeParse({
        run: fn,
      })
  }
  it('valid promise', async () => {
    const result = prepare(({ input }) => {
      return Promise.resolve(input.age)
    })
    expect(result.success).toBeTruthy()
    if (result.success) {
      const res = await result.data.run({ input: { age: 10 } })
      expect(res).toBe(10)
    }
  })
  it('valid result', async () => {
    const result = prepare(({ input }) => {
      return input.age
    })
    expect(result.success).toBeTruthy()
    if (result.success) {
      const res = await result.data.run({ input: { age: 10 } })
      expect(res).toBe(10)
    }
  })

  it('throw on invalid result', async () => {
    const result = prepare(({ input }) => {
      return input.age
    })
    expect(result.success).toBeTruthy()
    if (result.success) {
      expect(() => result.data.run({ input: { age: '10' } })).toThrow()
    }
  })

  it('throw on invalid input', async () => {
    const result = prepare(({ input }) => {
      return input.age
    })
    expect(result.success).toBeTruthy()
    if (result.success) {
      expect(() => result.data.run({ input: 10 })).toThrow()
    }
  })
})
