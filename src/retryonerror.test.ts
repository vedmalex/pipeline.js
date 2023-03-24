import 'jest'
import { RetryOnError } from './retryonerror'

describe('RetryOnError', function () {
  it('works', function (done) {
    var st = new RetryOnError({
      run: function (ctx) {
        ctx.works = true
      },
    })
    st.execute({}, function (err, ctx) {
      expect(err).toBeUndefined()
      expect(ctx.works).toBeTruthy()
      done()
    })
  })

  it('works in throw', function () {
    var st = new RetryOnError({
      run: function (ctx) {
        ctx.works = true
      },
    })
    expect(() =>
      st.execute({}, function (err, ctx) {
        throw new Error()
      }),
    ).toThrow()
  })

  it('retry works once by default', function (done) {
    var iter = 0
    var st = new RetryOnError({
      run: function (ctx) {
        ctx.works = true
        if (iter == 0) {
          iter++
          throw new Error('error')
        }
      },
    })
    st.execute({}, function (err, ctx) {
      expect(err).toBeUndefined()
      expect(ctx.works).toBeTruthy()
      expect(iter).toEqual(1)
      done()
    })
  })

  it('retry use custom restore and backup', function (done) {
    var iter = -1
    var st = new RetryOnError({
      run: function (ctx) {
        ctx.works = true
        if (iter++ < 3) {
          throw new Error('error')
        }
      },
      retry: 4,
      backup: function (ctx) {
        ctx.backup++
        return {
          works: ctx.works,
        }
      },
      restore: function (ctx, backup) {
        ctx.restore++
        ctx.works = backup.works
      },
    })
    st.execute(
      {
        works: false,
        backup: 0,
        restore: 0,
      },
      function (err, ctx) {
        expect(err).toBeUndefined()
        expect(ctx.works).toBeTruthy()
        expect(iter).toEqual(4)
        expect(ctx.backup).toEqual(1)
        expect(ctx.restore).toEqual(4)
        done()
      },
    )
  })

  it('retry works with rescue', function (done) {
    var iter = 0
    var count = 0
    var st = new RetryOnError({
      rescue: function (err, ctx) {
        iter += 1
        if (err.message !== 'error') return err
        ctx.rescue = true
      },
      run: function (ctx) {
        count += 1
        ctx.works = true
        throw new Error('error')
      },
    })
    st.execute({}, function (err, ctx) {
      expect(count).toBe(3)
      expect(iter).toEqual(1)
      expect(err).toBeUndefined()
      expect(ctx.works).toBeTruthy()
      expect(ctx.rescue).toBeTruthy()
      done()
    })
  })

  it('retry works as function', function (done) {
    var iter = 0
    var st = new RetryOnError({
      retry: function (err, ctx, iter) {
        return err.message === 'error'
      },
      run: function (ctx) {
        if (iter == 0) {
          iter++
          throw new Error('error')
        }
        ctx.works = true
      },
    })
    st.execute({}, function (err, ctx) {
      expect(err).toBeUndefined()
      expect(ctx.works).toBeTruthy()
      expect(iter).toEqual(1)
      done()
    })
  })

  it('retry works as number', function (done) {
    var iter = 0
    var st = new RetryOnError({
      retry: 1,
      run: function (ctx) {
        if (iter == 0) {
          iter++
          throw new Error('error')
        }
        ctx.works = true
      },
    })
    st.execute({}, function (err, ctx) {
      expect(err).toBeUndefined()
      expect(ctx.works).toBeTruthy()
      expect(iter).toEqual(1)
      done()
    })
  })
})
