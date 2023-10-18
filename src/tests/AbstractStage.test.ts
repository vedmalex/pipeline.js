import 'jest'
import z from 'zod'
import { AbstractStage } from '../base'

describe('AbstractStage', () => {
  it('validate input', async () => {
    const stage = new AbstractStage({
      input: z.string(),
      output: z.string(),
      run: ({ input }) => {
        return input
      },
    })
    let run = false
    try {
      // @ts-expect-error
      await stage.exec(10)
    } catch (err) {
      run = true
    }
    expect(run).toBeTruthy()
  })
  it('async validate input', async () => {
    const stage = new AbstractStage({
      input: z.string(),
      output: z.string(),
      run: async ({ input }) => {
        return input
      },
    })
    let run = false
    try {
      // @ts-expect-error
      await stage.exec(10)
    } catch (err) {
      run = true
    }
    expect(run).toBeTruthy()
  })
  it('validate output', async () => {
    const stage = new AbstractStage({
      input: z.number(),
      output: z.number(),
      // @ts-expect-error
      run: input => {
        return String(input)
      },
    })
    let run = false
    try {
      await stage.execute(10)
    } catch (err) {
      run = true
    }
    expect(run).toBeTruthy()
  })
  it('validate run', async () => {
    let run = false
    try {
      const stage = new AbstractStage({
        input: z.number(),
        output: z.number(),
        // @ts-expect-error
        run: 10,
      })
      await stage.execute(10)
    } catch (err) {
      run = true
    }
    expect(run).toBeTruthy()
  })
})
