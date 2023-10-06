import 'jest'
import { z } from 'zod'
import { builder } from '../builder'

describe('sequential', () => {
  it('parallel', async () => {
    const build = builder()
    const person = z.object({ name: z.string(), age: z.string() })
    const ages = z.object({ age: z.number() })

    const updateAge = build
      .type('stage')
      .input(ages)
      .output(ages)
      .run(input => {
        input.age += 1
        return input
      })
      .build()

    const st = build
      .type('sequential')
      .input(z.array(person))
      .output(z.array(z.number()))
      .stage(updateAge)
      .split(input => {
        const res = input.map(item => ({ age: parseInt(item.age, 10) }))
        return res
      })
      .combine((input, ret) => {
        return ret.map(input => input.age)
      })
      .build()

    const res = await st.exec([{ name: 'alex', age: '45' }, { name: 'egor', age: '21' }, { name: 'miron', age: '15' }])
    expect(res).toMatchObject([46,22,16])
  })
  it('sequential', async () => {
    const build = builder()
    const person = z.object({ name: z.string(), age: z.string() })
    const ages = z.object({ age: z.number() })

    const updateAge = build
      .type('stage')
      .input(ages)
      // .output(ages)
      .run(input => {
        input.age += 1
        return input
      })
      .build()

    const st = build
      .type('sequential')
      .serial()
      .input(z.array(person))
      .output(z.array(z.number()))
      .stage(updateAge)
      .split(input => {
        const res = input.map(item => ({ age: parseInt(item.age, 10) }))
        return res
      })
      .combine((input, ret) => {
        return ret.map(input => input.age)
      })
      .build()

    const res = await st.exec([{ name: 'alex', age: '45' }, { name: 'egor', age: '21' }, { name: 'miron', age: '15' }])
    expect(res).toMatchObject([46,22,16])
  })
})
