import z from 'zod'
import 'jest'
import { Stage } from './stage'
import { StageConfig } from './StageConfig'

describe('Stage_NEW', () => {
  it('throw error', done => {
    let st = new Stage({})
    // expect.assertions(1)
    st.execute({}, (err, context) => {
      expect(err).not.toBeUndefined()
      done()
    })
  })

  it('use non object context', done => {
    let st = new Stage({ run: (num: number) => num * 5 })
    // expect.assertions(1)
    st.execute(10, (err, context) => {
      expect(err).toBeUndefined()
      expect(context).toBe(50)
      done()
    })
  })

  it('empty run', done => {
    new Stage({}).execute({}, (err, res) => {
      expect(err).not.toBeUndefined()
      expect(res).toMatchObject({})
      done()
    })
  })
  it('create with function', () => {
    const s = new Stage({
      run: function (this: any) {
        this.name = 'run this Stage'
      },
    })
    expect(s).not.toBeNull()
    expect(s).toMatchSnapshot('function stage')
  })

  it('create with Lambda 3', () => {
    const s = new Stage({
      run: (err, ctx, done) => {
        if (!err) {
          ctx.name = 'run the stage'
          done()
        } else {
          done(err)
        }
      },
    })
    expect(s).toMatchSnapshot('lambda stage')
  })

  it('intialize using schema and validate separately', () => {
    expect(() =>
      new Stage({
        run: () => {},
        validate: (_ctx: { name?: string }) => true,
      })
    ).not.toThrow()
    expect(() =>
      new Stage({
        run: () => {},
        input: z.object({}).passthrough(),
      })
    ).not.toThrow()
  })

  it('output validation', done => {
    const st = new Stage({
      run: ctx => {
        ctx.lastname = 'Vedmedenko'
      },
      input: z.object({
        name: z.string({ required_error: 'should be an object with a name property' }),
      }),
      output: z.object({
        lastname: z.string({ required_error: 'should be an object with a name property' }),
      }),
    })

    st.execute({ name: 'Alex' }, (err, res) => {
      expect(err).toBeUndefined()
      expect(res).toMatchObject({ name: 'Alex', lastname: 'Vedmedenko' })
      done()
    })
  })

  it('output validation 1', done => {
    const st = new Stage({
      run: ctx => {
        ctx.lasname = 'Vedmedenko'
      },
      input: z.object({
        name: z.string({ required_error: 'should be an object with a name property' }),
      }),
      output: z.object({
        lastname: z.string({ required_error: 'should be an object with a name property' }),
      }),
    })

    st.execute({ name: 'Alex' }, (err, res) => {
      expect(err).not.toBeUndefined()
      expect(res).toMatchObject({ name: 'Alex', lasname: 'Vedmedenko' })
      done()
    })
  })

  it('input validation', done => {
    const st = new Stage({
      run: () => {},
      input: z.object({
        name: z.string({ required_error: 'should be an object with a name property' }),
      }),
    } as StageConfig<any, any>)

    st.execute({ fullname: 1 } as unknown as { name: string }, (err, res) => {
      expect(err).not.toBeUndefined()
      expect(err).toMatchSnapshot()
      done()
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
    expect(stage).toMatchSnapshot('schema stage 1')
  })

  it('create with Lambda 2', () => {
    const s = new Stage({
      run: (err, ctx) => {
        if (!err) {
          ctx.name = 'run the stage'
          return Promise.resolve(ctx)
        } else {
          return Promise.reject(err)
        }
      },
    })
    expect(s).toMatchSnapshot('lambda stage')
  })

  it('create with Config', () => {
    const s = new Stage({
      run: (err, ctx, done) => {
        if (!err) {
          ctx.name = 'run the stage'
          done(undefined, ctx)
        } else {
          done(err)
        }
      },
    })
    expect(s).toMatchSnapshot('config stage')
  })

  it('rescue do not enter twice into single rescue block', () => {
    let rescue = 0
    var st = new Stage({
      run: function (err, ctx, done) {
        throw new Error('error')
      },
      rescue: function (err, conext) {
        rescue += 1
        if (err.payload[0].message !== 'some') {
          throw err
        }
      },
    })
    st.execute({}, (err, res) => {
      expect(rescue).toBe(1)
    })
  })
})
