import { builder } from '../builder'

describe('emptBuilder', () => {
  // дальше работаем с типами!!! чтобы был контроль входщих данных и выходящих
  // исправить работу с Stage<any> похоже что TStage не нужен
  it('run', async () => {
    const st = builder()
      .type('empty')
      .build()

    const res = await st.execute({ city: 'NY' })
    expect(res).toMatchObject({ city: 'NY' })
  })
})
