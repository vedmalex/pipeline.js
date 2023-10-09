import { z } from 'zod'
import { builder } from '../builder'

describe('ifelseBuilder', () => {
  // дальше работаем с типами!!! чтобы был контроль входщих данных и выходящих
  // исправить работу с Stage<any> похоже что TStage не нужен
  it('run', async () => {
    const falsy = builder()
      .type('stage')
      .input(z.object({ name: z.string() }))
      .output(z.object({ name: z.string(), success: z.boolean(), fixed: z.boolean() }))
      .run(async ({ name }) => {
        return {
          name: name ? name : 'undefined',
          success: false,
          fixed: false
        }
      }).build()

    const truthy = builder()
      .type('stage')
      .input(z.object({ name: z.string() }))
      .output(z.object({ name: z.string(), success: z.boolean() }))
      .run(async ({ name }) => {
        return {
          name: name ? name : 'undefined',
          success: true,
        }
      }).build()

    const st = builder()
      .type('ifelse')
      .stage(truthy)
      .if((input) => {
        const inp = input as {name: string}
        return inp.name === 'Alex'
      })
      // .then(truthy)
      .else(falsy)
      .build()

    const resFalsey = await st.exec({ name: 'name' })
    expect(resFalsey).toMatchObject({ name: 'name', success: false })

    const resTruthy = await st.exec({ name: 'Alex' })
    expect(resTruthy).toMatchObject({ name: 'Alex', success: true })
  })
})
