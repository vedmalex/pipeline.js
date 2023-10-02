import 'jest'
import { z } from 'zod'
import { builder } from './StageBuilderWithZod'

describe('stageBuilder', () => {
  // дальше работаем с типами!!! чтобы был контроль входщих данных и выходящих
  // исправить работу с Stage<any> похоже что TStage не нужен
  it('run', async () => {
    const st = builder()
      .type('stage')
      .input(z.string().optional())
      .output(z.object({ name: z.string(), full: z.string() }))
      .run(async name => {
        return {
          name: name ? name : 'undefined',
          full: 'full',
        }
      })
      .build()

    const res = await st.exec('name')
    expect(res).toMatchObject({ name: 'name', full: 'full' })
  })
})

describe('rescueBuilder', () => {
  // дальше работаем с типами!!! чтобы был контроль входщих данных и выходящих
  // исправить работу с Stage<any> похоже что TStage не нужен
  it('run', async () => {
    const st = builder()
      .type('rescue')
      .stage(
        builder()
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
          }).build(),
      )
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
