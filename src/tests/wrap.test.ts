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
      .run(async ({ input: name }) => {
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
      .prepare(({ input }) => {
        return input.city
      })
      .finalize(({ input, data }) => {
        return {
          ...input,
          district: data.full,
        }
      })
      .build()

    const res = await st.exec({ input: { city: 'NY' } })
    expect(res).toMatchObject({ city: 'NY', district: 'full' })
  })
  it('sequential', () => {
    const person = z.object({ name: z.string(), age: z.string() })
    const ages = z.object({ age: z.number() })

    const updateAge = builder()
      .type('dowhile')
      .input(z.array(ages))
      .do(
        builder()
          .type('stage')
          .input(ages)
          .output(ages)
          .run(({ input }) => {
            input.age += 1
            return input
          })
          .build(),
      )
      .step(({ input, iteration }) => {
        return input[iteration]
      })
      .combine(({ input, result, iteration }) => {
        input[iteration] = result
        return input
      })
      .while(({ input, iteration }) => {
        return iteration <= input.length
      }).build()

    builder()
      .type('wrap')
      .input(z.array(person))
      .output(z.array(z.number()))
      .stage(updateAge)
      .prepare(({ input }) => {
        return input.map(item => ({ age: parseInt(item.age, 10) }))
      })
      .finalize(({ input, data }) => {
        return data.map(input => input.age)
      })
      .build()
  })
})
