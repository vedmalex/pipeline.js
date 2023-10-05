import { z } from 'zod'
import { builder } from '../builder'

describe('pipelineBuilder', () => {
  // дальше работаем с типами!!! чтобы был контроль входщих данных и выходящих
  // исправить работу с Stage<any> похоже что TStage не нужен
  it('run', async () => {
    const st = builder()
      .type('pipeline')
      .stage(
        builder()
          .type('stage')
          .input(z.object({})).output(z.object({ name: z.string() })).run(input => {
            return {
              name: 'name',
            }
          }).build(),
      )
      .stage(
        builder()
          .type('stage')
          .input(z.object({}).passthrough())
          .output(z.object({ name: z.string() }))
          .run(input => {
            return {
              ...input,
              name: 'name',
            }
          }).build(),
      )
      .stage(
        builder()
          .type('stage')
          .input(z.object({
          }).passthrough())
          .output(z.object({
            age: z.number(),
          }).passthrough())
          .run(input => {
            return {
              ...input,
              age: 10,
            }
          }).build(),
      )
      .build()

    const res = await st.exec({})
    expect(res).toMatchObject({ name: 'name', age: 10 })
  })
})
