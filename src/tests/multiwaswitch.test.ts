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
          .run(({ input }) => {
            return {
              ...input,
              id: '1000'
            }
          }).build(),
      )
      .evaluate(({input:item}) => !item.id)
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
          .run(({ input }) => {
            return {
              ...input,
              region: 'new region'
            }
          }).build(),
      )
      .evaluate(({input:item}) => !item.region)
      .build()

    const sw = builder()
      .type('multiwayswitch')
      .add(stCaseOne)
      .add(stCaseTwo)
      .build()

    const result = await sw.execute({ name: 'alex', city: 'NBJ' })
    expect(result).toMatchObject({ name: 'alex', city: 'NBJ', region: 'new region', id: '1000' })

  })
})
