import { z } from 'zod'
import { builder } from '../builder'

describe('pipelineBuilder', () => {
  // дальше работаем с типами!!! чтобы был контроль входщих данных и выходящих
  // исправить работу с Stage<any> похоже что TStage не нужен
  it('run', async () => {
    const st = builder()
      .type('pipeline')
      .addStage(
        builder()
          .type('stage')
          .input(z.object({}))
          .output(z.object({ name: z.string() }))
          .run(({ input }) => {
            return {
              name: 'name',
            }
          }).build(),
      )
      .addStage(
        builder()
          .type('stage')
          .input(z.object({}).passthrough())
          .output(z.object({ name: z.string() }))
          .run(({ input }) => {
            return {
              ...input,
              name: 'name',
            }
          }).build(),
      )
      .addStage(
        builder()
          .type('stage')
          .input(z.object({}).passthrough())
          .output(
            z.object({
              age: z.number(),
            }).passthrough(),
          )
          .run(({ input }) => {
            return {
              ...input,
              age: 10,
            }
          }).build(),
      )
      .build()

    try {
      const res = await st.execute({})
      expect(res).toMatchObject({ name: 'name', age: 10 })
    } catch (err) {
      debugger
    }
  })
})
