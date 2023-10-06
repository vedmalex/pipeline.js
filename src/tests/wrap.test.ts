import { z } from 'zod'
import { builder } from '../builder'

describe('wrapBuilder', () => {
  // дальше работаем с типами!!! чтобы был контроль входщих данных и выходящих
  // исправить работу с Stage<any> похоже что TStage не нужен
  it('run', async () => {
    const wrapee = builder()
      .type('stage')
      .input(z.string().optional())
      .output(z.object({ name: z.string(), full: z.string() }))
      .run(async name => {
        if (name === 'name') {
          throw new Error('error')
        }
        return {
          name: name ? name : 'undefined',
          full: 'full',
        }
      }).build()

    const st = builder()
      .type('wrap')
      .input(z.object({ city: z.string() }))
      .output(z.object({ city: z.string(), district: z.string() }))
      .stage(wrapee)
      .prepare(input => {
        return input.city
      })
      .finalize((ctx, ret) => {
        return {
          ...ctx,
          district: ret.full,
        }
      })
      .build()

    const res = await st.exec({ city: 'NY' })
    expect(res).toMatchObject({ city: 'NY', district: 'full' })
  })
  it('sequential', () => {
    const build = builder()
    const person = z.object({ name: z.string(), age: z.string() })
    const ages = z.object({ age: z.number() })

    const updateAge = build
      .type('dowhile')
      .input(z.array(ages))
      .stage(
        build
          .type('stage')
          .input(ages)
          .output(ages)
          .run(input => {
            input.age += 1
            return input
          })
          .build(),
      ).reachEnd((input, iter) => {
        return iter <= input.length
      }).build()

    build
      .type('wrap')
      .input(z.array(person))
      .output(z.array(z.number()))
      .stage(updateAge)
      .prepare(input => {
        return input.map(item => ({ age: parseInt(item.age, 10) }))
      })
      .finalize((input, ret) => {
        return ret.map(input => input.age)
      })
      .build()
  })
})
