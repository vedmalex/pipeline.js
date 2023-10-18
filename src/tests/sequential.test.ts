import 'jest'
import z from 'zod'
import { builder } from '../builder'

describe('sequential', () => {
  it('parallel', async () => {
    const ages = z.object({ age: z.number() }).passthrough()

    const updateAge = builder()
      .type('stage')
      .input(ages)
      .output(ages)
      .run(({ input }) => {
        input.age += 1
        return input
      })
      .build()

    const st = builder()
      .type('sequential')
      .stage(updateAge)
      .build()

    const res = await st.execute([{ name: 'alex', age: 45 }, { name: 'egor', age: 21 }, { name: 'miron', age: 15 }])
    expect(res).toMatchObject([{ name: 'alex', age: 46 }, { name: 'egor', age: 22 }, { name: 'miron', age: 16 }])
  })
  it('sequential', async () => {
    const ages = z.object({ age: z.number() }).passthrough()

    const updateAge = builder()
      .type('stage')
      .input(ages)
      // .output(ages)
      .run(({ input }) => {
        input.age += 1
        return input
      })
      .build()

    const st = builder()
      .type('sequential')
      .serial()
      .stage(updateAge)
      .build()

    const res = await st.execute([{ name: 'alex', age: 45 }, { name: 'egor', age: 21 }, { name: 'miron', age: 15 }])
    expect(res).toMatchObject([{ name: 'alex', age: 46 }, { name: 'egor', age: 22 }, { name: 'miron', age: 16 }])
  })
})
