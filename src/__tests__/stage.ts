import 'jest'
import { Stage } from '../stage'

describe('stage', () => {
  it('create named', () => {
    const s = new Stage('name')
    expect(s).not.toBeNull()
    expect(s).toMatchSnapshot('names stage')
  })
  it('create with function', () => {
    const s = new Stage<{ name?: string }>(function RunStage(this: {
      name?: string
    }) {
      this.name = 'run this Stage'
    })
    expect(s).not.toBeNull()
    expect(s).toMatchSnapshot('function stage')
  })

  it('create with Lambda 3', () => {
    const s = new Stage<{ name: string }>((err, ctx, done) => {
      if (!err) {
        ctx.name = 'run the stage'
        done(undefined, ctx)
      } else {
        done(err)
      }
    })
    expect(s).toMatchSnapshot('lambda stage')
  })

  it('creates throws when both parameters validate and schema are passed', () => {
    expect(
      () =>
        new Stage({
          run: () => {},
          schema: {},
          validate: {},
        } as any),
    ).toThrow()
  })

  it('intialize using schema and validate separately', () => {
    expect(
      () =>
        new Stage<{ name?: string }>({
          run: () => {},
          validate: (_ctx: {}) => true,
        }),
    ).not.toThrow()
    expect(
      () =>
        new Stage({
          run: () => {},
          schema: {},
        }),
    ).not.toThrow()
  })

  it('validate using schema', () => {
    const st = new Stage<{ name: string }>({
      run: () => {},
      schema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
        required: ['name'],
        additionalProperties: false,
        errorMessage: 'should be an object with a name property',
      },
    })

    st.execute({ fullname: 1 }, (err, res) => {
      expect(err).not.toBeUndefined()
      expect(err).toMatchSnapshot()
    })
  })

  it('initialize other stuff sucessfully', () => {
    let stage = new Stage({
      run: () => {},
      ensure: () => {},
      rescue: () => {},
      name: 'stage',
    })
    expect(stage.name).toBe('stage')
    expect(stage.reportName).toBe(`STG:${stage.name}`)
    expect(stage).toMatchSnapshot('schema stage 1')
  })

  it('create with Lambda 2', () => {
    const s = new Stage((err, ctx) => {
      if (!err) {
        ctx.name = 'run the stage'
        return Promise.resolve(ctx)
      } else {
        return Promise.reject(err)
      }
    })
    expect(s).toMatchSnapshot('lambda stage')
  })

  it('create with Config', () => {
    const s = new Stage<{ name: string }>((err, ctx, done) => {
      if (!err) {
        ctx.name = 'run the stage'
        done(undefined, ctx)
      } else {
        done(err)
      }
    })
    expect(s).toMatchSnapshot('config stage')
  })
})
