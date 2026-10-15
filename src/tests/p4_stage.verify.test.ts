import { Stage } from '../stage'
import { Pipeline, __setCompiledPipelineEnabledForTests } from '../pipeline'
import { Timeout } from '../timeout'
import { Config } from '../config'
import { Context, CurrentStage } from '../context'
import { __resetContextExecutionModeForTests, setContextExecutionMode } from '../context_mode'

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

afterEach(() => {
  __setCompiledPipelineEnabledForTests(undefined)
  __resetContextExecutionModeForTests()
  Config.timeout = Infinity
})

// Each probe asserts the contract. A failing assertion = reproduced defect.

describe('P4 verify: Timeout stage-path completion invariant', () => {
  it('P1 control: clonable ctx yields exactly one callback', async () => {
    const calls: any[] = []
    const t = new Timeout({ timeout: 30, stage: async (ctx: any) => ctx } as any)
    t.execute({ a: 1 } as any, (err: any, c: any) => calls.push({ err, c }))
    await wait(80)
    expect(calls.length).toBe(1)
  })

  it('P1 defect: non-clonable ctx -> exactly one outcome (throw OR callback, not both)', async () => {
    const calls: any[] = []
    const t = new Timeout({ timeout: 30, stage: async (ctx: any) => ctx } as any)
    let syncThrow: unknown = null
    try {
      t.execute({ p: Promise.resolve(1) } as any, (err: any, c: any) => calls.push({ err, c }))
    } catch (e) {
      syncThrow = e
    }
    await wait(80)
    // invariant: exactly one of {sync throw, callback} happens
    expect((syncThrow ? 1 : 0) + calls.length).toBe(1)
  })

  it('P2 control: compiled Pipeline with Timeout child, clonable ctx -> one callback', async () => {
    __setCompiledPipelineEnabledForTests(true)
    const calls: any[] = []
    const p = new Pipeline({
      stages: [new Timeout({ timeout: 30, stage: async (ctx: any) => ctx } as any)],
    } as any)
    p.execute({ a: 1 } as any, (err: any, c: any) => calls.push({ err, c }))
    await wait(80)
    expect(calls.length).toBe(1)
  })

  it('P2 defect: compiled Pipeline with Timeout child, non-clonable ctx -> one outcome', async () => {
    __setCompiledPipelineEnabledForTests(true)
    const calls: any[] = []
    const p = new Pipeline({
      stages: [new Timeout({ timeout: 30, stage: async (ctx: any) => ctx } as any)],
    } as any)
    let syncThrow: unknown = null
    try {
      p.execute({ p: Promise.resolve(1) } as any, (err: any, c: any) => calls.push({ err, c }))
    } catch (e) {
      syncThrow = e
    }
    await wait(80)
    expect((syncThrow ? 1 : 0) + calls.length).toBe(1)
  })
})

describe('P4 verify: falsy context in explicit mode', () => {
  it('P3 defect: plain stage with undefined input must run its run-fn (legacy does)', () => {
    const ran: unknown[] = []
    const s = new Stage(((ctx: any) => {
      ran.push(ctx)
      return ctx
    }) as any)
    setContextExecutionMode('legacy')
    s.execute(undefined as any, () => {})
    expect(ran.length).toBe(1)

    __resetContextExecutionModeForTests()
    const ran2: unknown[] = []
    const s2 = new Stage(((ctx: any) => {
      ran2.push(ctx)
      return ctx
    }) as any)
    s2.execute(undefined as any, () => {})
    expect(ran2.length).toBe(1)
  })

  it('P4 parity: Stage.execute(undefined) and Pipeline.execute(undefined) agree on running run-fn', () => {
    const stageRan: unknown[] = []
    new Stage(((ctx: any) => {
      stageRan.push(ctx)
      return ctx
    }) as any).execute(undefined as any, () => {})

    const pipeRan: unknown[] = []
    __setCompiledPipelineEnabledForTests(true)
    new Pipeline({
      stages: [
        (ctx: any) => {
          pipeRan.push(ctx)
          return ctx
        },
      ],
    } as any).execute(undefined as any, () => {})

    expect(stageRan.length).toBe(pipeRan.length)
  })

  it('P5 defect: input error with falsy ctx must reach callback', () => {
    const got: unknown[] = []
    const s = new Stage((err: any, ctx: any, done: any) => done(err, ctx)) as any
    s.execute(new Error('input-boom') as any, undefined as any, (err: any) => got.push(err))
    expect(got.length).toBe(1)
    expect(got[0]).toBeTruthy()
  })
})

describe('P4 verify: arity-0 run returning a promise (callback ctx)', () => {
  it('P6a defect: direct Stage with arity-0 run returning promise passes resolved value as ctx', async () => {
    const got: any[] = []
    const s = new Stage(function () {
      return Promise.resolve({ x: 1 })
    } as any)
    s.execute({} as any, (_err: any, c: any) => got.push(c))
    await wait(20)
    expect(got.length).toBe(1)
    expect(got[0]).toEqual({ x: 1 })
  })

  it('P6b control: raw function child in compiled Pipeline returns resolved value', async () => {
    __setCompiledPipelineEnabledForTests(true)
    const got: any[] = []
    const p = new Pipeline({
      stages: [
        function () {
          return Promise.resolve({ x: 1 })
        },
      ],
    } as any)
    p.execute({} as any, (_err: any, c: any) => got.push(c))
    await wait(20)
    expect(got.length).toBe(1)
    expect(got[0]).toEqual({ x: 1 })
  })

  it('P6c defect: devirtualized Stage child (arity-0 promise) inside compiled Pipeline', async () => {
    __setCompiledPipelineEnabledForTests(true)
    const got: any[] = []
    const p = new Pipeline({
      stages: [
        new Stage(function () {
          return Promise.resolve({ x: 1 })
        } as any),
      ],
    } as any)
    p.execute({} as any, (_err: any, c: any) => got.push(c))
    await wait(20)
    expect(got.length).toBe(1)
    expect(got[0]).toEqual({ x: 1 })
  })
})

describe('P4 verify: validate and ensure paths', () => {
  it('P7 defect: async validate returning truthy non-boolean must still call back', async () => {
    const got: any[] = []
    const s = new Stage({
      validate: async (_ctx: any) => 'yes',
      run: (ctx: any) => ctx,
    } as any)
    s.execute({} as any, (err: any, c: any) => got.push({ err, c }))
    await wait(50)
    expect(got.length).toBe(1)
  })

  it('P8 hypothesis: validate is skipped when ensure is configured', async () => {
    let ran = 0
    const got: any[] = []
    const s = new Stage({
      ensure: (ctx: any) => ctx,
      validate: (_ctx: any) => false,
      run: (ctx: any) => {
        ran++
        return ctx
      },
    } as any)
    s.execute({} as any, (err: any) => got.push(err))
    await wait(10)
    expect(ran).toBe(0)
  })
})

describe('P4 verify: exceptions from user callback', () => {
  it('P9 defect: user callback exception must not vanish (no Config.timeout)', () => {
    const s = new Stage((ctx: any) => ctx as any)
    let thrown: unknown = null
    try {
      s.execute({} as any, () => {
        throw new Error('user-boom')
      })
    } catch (e) {
      thrown = e
    }
    expect(thrown).not.toBeNull()
    expect(String((thrown as any)?.message ?? thrown)).toContain('user-boom')
  })
})

describe('P4 verify: Timeout without stage and input error', () => {
  it('P10 hypothesis: input error must pass through Timeout without stage', async () => {
    const got: any[] = []
    const t = new Timeout({ timeout: 10 } as any)
    t.execute(new Error('in') as any, {} as any, (err: any) => got.push(err))
    await wait(40)
    expect(got.length).toBe(1)
    expect(got[0]).toBeTruthy()
  })
})

describe('P4 verify: Context[CurrentStage] after nested execute', () => {
  it('P11 hypothesis: CurrentStage restored to outer stage after inner execute', () => {
    const ctx = Context.ensure({ a: 1 } as any) as any
    const inner = new Stage((c: any) => c as any)
    let seen: unknown
    const outer = new Stage(((c: any) => {
      inner.execute(c, () => {})
      seen = c[CurrentStage]
      return c
    }) as any)
    outer.execute(ctx, () => {})
    expect(seen).toBe(outer)
  })
})
