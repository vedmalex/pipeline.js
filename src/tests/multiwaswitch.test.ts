import 'jest'
import { z } from 'zod'
import { builder } from '../builder'

describe('multiwayswitch', () => {
  it('case', async () => {
    const build = builder()
    const stCaseOne = build
      .type('multiwayswitchcase')
      .stage(
        build
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

    const stCaseTwo = build
      .type('multiwayswitchcase')
      .stage(
        build
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

    const sw = build
      .type('multiwayswitch')
      .add(stCaseOne)
      .add(stCaseTwo)
      // .build()
  })
})
