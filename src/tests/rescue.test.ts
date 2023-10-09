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
      .type('rescue')
      .stage(st0)
      .rescue(({ error, input }) => {
        if (error?.message === 'error') {
          return { name: input ?? 'name', full: 'full' }
        }
        throw error
      })
      .build()

    const res = await st.execute('name')
    expect(res).toMatchObject({ name: 'name', full: 'full' })
  })
})
