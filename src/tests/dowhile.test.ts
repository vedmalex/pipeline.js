import { z } from 'zod'
import { builder } from '../builder'

describe('wrapBuilder', () => {
  // дальше работаем с типами!!! чтобы был контроль входщих данных и выходящих
  // исправить работу с Stage<any> похоже что TStage не нужен
  it('run', async () => {
    const wrapee = builder()
      .type('stage')
      .input(z.object({ name: z.string(), district: z.string(), processed: z.boolean().optional() }))
      .output(z.object({ name: z.string(), district: z.string(), processed: z.boolean() }))
      .run(async input => {
        return {
          ...input,
          processed: true,
        }
      }).build()

    const st = builder()
      .type('dowhile')
      .input(z.array(z.object({ city: z.string(), district: z.string() })))
      .stage(wrapee)
      .split((input, iter) => {
        return {
          name: input[iter].city,
          district: input[iter].district,
        }
      })
      .combine((input, { name, ...rest }, iter) => {
        const res = {
          city: name,
          ...rest,
        }
        input[iter] = res
        return input
      })
      .reachEnd((input, iter) => {
        return iter >= input.length
      })
      .build()

    const res = await st.exec([{ city: 'NY', district: 'full' }])
    expect(res).toMatchObject([{ city: 'NY', district: 'full', processed: true }])
  })
})
