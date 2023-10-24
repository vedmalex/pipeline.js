import { stage } from 'src'
import z from 'zod'
import { builder } from '../builder'

describe('stageBuilder', () => {
  // дальше работаем с типами!!! чтобы был контроль входщих данных и выходящих
  // исправить работу с Stage<any> похоже что TStage не нужен
  it('run', async () => {
    const st = builder()
      .type('stage')
      .input(z.string().optional())
      .output(z.object({ name: z.string(), full: z.string() }))
      .run(({ input: name }) => {
        return {
          name: name ? name : 'undefined',
          full: 'full',
        }
      }).build()

    const res = await st.exec({ input: 'name' })
    expect(res).toMatchObject({ name: 'name', full: 'full' })
    const res2 = await st.execute('name')
    expect(res2).toMatchObject({ name: 'name', full: 'full' })
  })
  it('run just_stage', async () => {
    const st = stage()
      .input(z.string().optional())
      .output(z.object({ name: z.string(), full: z.string() }))
      .run(({ input: name }) => {
        return {
          name: name ? name : 'undefined',
          full: 'full',
        }
      }).build()

    const res = await st.exec({ input: 'name' })
    expect(res).toMatchObject({ name: 'name', full: 'full' })
    const res2 = await st.execute('name')
    expect(res2).toMatchObject({ name: 'name', full: 'full' })
  })
})
