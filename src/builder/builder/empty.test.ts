import { z } from 'zod'
import { builder } from './builder'

describe('rescueBuilder', () => {
  // дальше работаем с типами!!! чтобы был контроль входщих данных и выходящих
  // исправить работу с Stage<any> похоже что TStage не нужен
  it('run', async () => {
    const wrapee = builder()
      .type('empty')
      .build()

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
})
