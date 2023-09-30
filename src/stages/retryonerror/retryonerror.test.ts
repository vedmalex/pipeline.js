import 'jest'
import { RetryOnError } from './retryonerror'

describe('RetryOnError', function () {
  it('works', function (done) {
    type CTX = {
      works: boolean
    }
    var st = new RetryOnError({
      stage: function (ctx) {
        ctx.works = true
      },
    })
    st.execute({}, function (err, ctx) {
      expect(err).toBeUndefined()
      expect(ctx?.works).toBeTruthy()
      done()
    })
  })

  it('works in throw', function (done) {
    var st = new RetryOnError({
      stage: function (ctx) {
        ctx.works = true
        throw new Error()
      },
    })
    st.execute({}, function (err, ctx) {
      expect(err).not.toBeUndefined()
      done()
    })
  })

  it('retry works once by default', function (done) {
    var iter = 0
    var st = new RetryOnError<{ works: boolean }, {}>({
      stage: function (ctx) {
        ctx.works = true
        if (iter == 0) {
          iter++
          throw new Error('error')
        }
      },
    })
    st.execute({}, function (err, ctx) {
      expect(err).toBeUndefined()
      expect(ctx?.works).toBeTruthy()
      expect(iter).toEqual(1)
      done()
    })
  })

  it('retry use custom restore and backup', function (done) {
    var iter = -1
    var st = new RetryOnError<{ works: boolean; backup: number; restore: number }, { works: boolean }>({
      stage: function (ctx) {
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
      restore: function (ctx, backup: { works: boolean }) {
        ctx.restore++
        ctx.works = backup.works
      },
    })
    st.execute({
      works: false,
      backup: 0,
      restore: 0,
    }, function (err, ctx) {
      expect(err).toBeUndefined()
      expect(ctx?.works).toBeTruthy()
      expect(iter).toEqual(4)
      expect(ctx?.backup).toEqual(1)
      expect(ctx?.restore).toEqual(4)
      done()
    })
  })

  it('retry works with rescue', function (done) {
    var iter = 0
    var count = 0
    var st = new RetryOnError<{ rescue: boolean; works: boolean }, {}>({
      rescue: function (err, ctx) {
        iter += 1
        if (err.payload[0].message !== 'error') {
          return err
        }
        ctx.rescue = true
      },
      stage: function (ctx) {
        count += 1
        ctx.works = true
        throw new Error('error')
      },
    })
    st.execute({}, function (err, ctx) {
      expect(count).toBe(3)
      expect(iter).toEqual(1)
      expect(err).toBeUndefined()
      expect(ctx?.works).toBeTruthy()
      expect(ctx?.rescue).toBeTruthy()
      done()
    })
  })

  it('retry works as function', function (done) {
    var iter = 0
    var st = new RetryOnError<{ works: boolean }, {}>({
      retry: function (err, ctx, iter) {
        return (err?.payload[0] as Error).message === 'error'
      },
      stage: function (ctx) {
        if (iter == 0) {
          iter++
          throw new Error('error')
        }
        ctx.works = true
      },
    })
    st.execute({}, function (err, ctx) {
      expect(err).toBeUndefined()
      expect(ctx?.works).toBeTruthy()
      expect(iter).toEqual(1)
      done()
    })
  })

  it('retry works as number', function (done) {
    var iter = 0
    var st = new RetryOnError<{ works: boolean }, {}>({
      retry: 1,
      stage: function (ctx) {
        if (iter == 0) {
          iter++
          throw new Error('error')
        }
        ctx.works = true
      },
    })
    st.execute({}, function (err, ctx) {
      expect(err).toBeUndefined()
      expect(ctx?.works).toBeTruthy()
      expect(iter).toEqual(1)
      done()
    })
  })
})
