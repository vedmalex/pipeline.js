import { z } from 'zod'
import { builder } from '../builder'

describe('doWhileBuilder', () => {
  // дальше работаем с типами!!! чтобы был контроль входщих данных и выходящих
  // исправить работу с Stage<any> похоже что TStage не нужен
  it('run', async () => {
    const wrapee = builder()
      .type('stage')
      .input(z.object({ name: z.string(), district: z.string(), processed: z.boolean().optional() }))
      .output(z.object({ name: z.string(), district: z.string(), processed: z.boolean() }))
      .run(async ({ input }) => {
        return {
          ...input,
          processed: true,
        }
      }).build()

    const st = builder()
      .type('dowhile')
      .input(z.array(z.object({ city: z.string(), district: z.string() }).passthrough()))
      .do(wrapee)
      .step(({ input, iteration }) => {
        return {
          name: input[iteration].city,
          district: input[iteration].district,
        }
      })
      .combine(({ input, output, result, iteration }) => {
        const { name, ...rest } = result
        const res = {
          city: name,
          ...rest,
        }
        input[iteration] = res
        return input
      })
      .while(({ input, iteration }) => {
        return iteration < input.length
      })
      .build()

    const res = await st.exec({ input: [{ city: 'NY', district: 'full' }] })
    expect(res).toMatchObject([{ city: 'NY', district: 'full', processed: true }])
  })
})
