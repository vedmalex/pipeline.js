import { z } from 'zod'
import { builder } from '../builder'

describe('rescueBuilder', () => {
  // дальше работаем с типами!!! чтобы был контроль входщих данных и выходящих
  // исправить работу с Stage<any> похоже что TStage не нужен
  it('run', async () => {
    let retries = 0
    const st = builder()
      .type('retryonerror')
      .stage(
        builder()
          .type('stage')
          .input(z.string().optional())
          .output(z.object({ name: z.string(), full: z.string() }))
          .run(async ({ input: name }) => {
            retries++
            if (name === 'name') {
              throw new Error('error')
            }
            return {
              name: name ? name : 'undefined',
              full: 'full',
            }
          }).build(),
      )
      .retry(10)
      .backup(({ input }) => {
        return JSON.stringify(input)
      })
      .restore(({ input, backup }) => {
        input?.split('')
        return JSON.parse(backup)
      })
      .build()

    try {
      const res = await st.execute('name')
      expect(res).toMatchObject({ name: 'name', full: 'full' })
    } catch (err) {
      expect(retries).toBe(10)
    }
  })
})
