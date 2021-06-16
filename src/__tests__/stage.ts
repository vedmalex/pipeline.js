import 'jest'
import { Stage } from '../stage'

describe('stage', () => {
  it('create named', () => {
    const s = new Stage('name')
    expect(s).not.toBeNull()
    expect(s).toMatchSnapshot('names stage')
  })
  it('create with function', () => {
    const s = new Stage(function RunStage() {
      this.name = 'run this Stage'
    })
    expect(s).not.toBeNull()
    expect(s).toMatchSnapshot('function stage')
  })

  it('create with Lambda 3', () => {
    const s = new Stage((err, ctx, done) => {
      if (!err) {
        ctx.name = 'run the stage'
        done(null, ctx)
      } else {
        done(err)
      }
    })
    expect(s).toMatchSnapshot('lambda stage')
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
    const s = new Stage((err, ctx, done) => {
      if (!err) {
        ctx.name = 'run the stage'
        done(null, ctx)
      } else {
        done(err)
      }
    })
    expect(s).toMatchSnapshot('config stage')
  })
})
