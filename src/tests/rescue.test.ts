import { z } from 'zod'
import { builder } from '../builder'

describe('rescueBuilder', () => {
  // дальше работаем с типами!!! чтобы был контроль входщих данных и выходящих
  // исправить работу с Stage<any> похоже что TStage не нужен
  it('run', async () => {
    const st0 = builder()
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
      .type('rescue')
      .stage(st0)
      .rescue((err, input) => {
        if (err?.message === 'error') {
          return { name: input ?? 'name', full: 'full' }
        }
        throw err
      })
      .build()

    const res = await st.exec('name')
    expect(res).toMatchObject({ name: 'name', full: 'full' })
  })
})
