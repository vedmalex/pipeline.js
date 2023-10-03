import { builder } from '../builder'
import { z } from 'zod'

describe('stageBuilder', () => {
  // дальше работаем с типами!!! чтобы был контроль входщих данных и выходящих
  // исправить работу с Stage<any> похоже что TStage не нужен
  it('run', async () => {
    const falsy = builder()
      .type('stage')
      .input(z.object({ name: z.string() }).passthrough())
      .output(z.object({ name: z.string(), success: z.boolean() }).passthrough())
      .run(async ({ name }) => {
        return {
          name: name ? name : 'undefined',
          success: false,
        }
      }).build()

    const truthy = builder()
      .type('stage')
      .input(z.object({ name: z.string() }).passthrough())
      .output(z.object({ name: z.string(), success: z.boolean() }).passthrough())
      .run(async ({ name }) => {
        return {
          name: name ? name : 'undefined',
          success: true,
        }
      }).build()

    const st = builder()
      .type('ifelse')
      .input(z.object({ name: z.string() }).passthrough())
      .output(z.object({ name: z.string(), success: z.boolean() }).passthrough())
      .condition(input => input.name === 'Alex')
      .truthy(truthy)
      .falsy(falsy)
      .build()

    const resFalsey = await st.exec({ name: 'name' })
    expect(resFalsey).toMatchObject({ name: 'name', success: false })

    const resTruthy = await st.exec({ name: 'Alex' })
    expect(resTruthy).toMatchObject({ name: 'Alex', success: true })
  })
})
