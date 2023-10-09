import 'jest'
import { z } from 'zod'
import { builder } from '../builder'

describe('multiwayswitch', () => {
  it('case', async () => {
    const stCaseOne = builder()
      .type('multiwayswitchcase')
      .stage(
        builder()
          .type('stage')
          .input(z.object({ name: z.string(), id: z.string().optional() }))
          .output(z.object({ name: z.string(), id: z.string() }))
          .run(input => {
            return {
              ...input,
              id: String(Math.random() * 1000),
            }
          }).build(),
      )
      .evaluate(item => !item.id)
      .build()

    const stCaseTwo = builder()
      .type('multiwayswitchcase')
      .stage(
        builder()
          .type('stage')
          .input(z.object({
            city: z.string(),
            region: z.string().optional(),
          }))
          .output(z.object({
            city: z.string(),
            region: z.string(),
          }))
          .run(input => {
            return {
              ...input,
              region: String(Math.random() * 1000),
            }
          }).build(),
      )
      .evaluate(item => !item.region)
      .build()

    const sw = builder()
      .type('multiwayswitch')
      .add(stCaseOne)
      .add(stCaseTwo)
      .build()
  })
})
