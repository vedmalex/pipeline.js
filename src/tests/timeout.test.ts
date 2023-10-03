import { builder } from '../builder'
import { z } from 'zod'

describe('timeoutBuilder', () => {
  // дальше работаем с типами!!! чтобы был контроль входщих данных и выходящих
  // исправить работу с Stage<any> похоже что TStage не нужен
  it('run', async () => {
    const st = builder()
      .type('timeout')
      .stage(
        builder()
          .type('stage')
          .input(z.string().optional())
          .output(z.object({ name: z.string(), full: z.string() }))
          .run(async name => {
            return {
              name: name ? name : 'undefined',
              full: 'full',
            }
          }).build(),
      )
      .timeout(100)
      .overdue(
        builder()
          .type('stage')
          .input(z.string().optional())
          .output(z.object({ name: z.string(), full: z.string() }))
          .run(async name => {
            return {
              name: name ? name : 'undefined',
              full: 'full',
            }
          }).build(),
      )
      .build()

    const res = await st.exec('name')
    expect(res).toMatchObject({ name: 'name', full: 'full' })
  })
})
