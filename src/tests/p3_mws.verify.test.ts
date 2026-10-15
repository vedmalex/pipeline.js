import { describe, expect, it } from 'bun:test'
import { compilePipelinePlan } from '../compiled/compiler'
import { executeCompiledPlan } from '../compiled/executor'
import { Empty } from '../empty'
import { MultiWaySwitch } from '../multiwayswitch'
import { __setCompiledPipelineEnabledForTests, Pipeline } from '../pipeline'
import { Stage } from '../stage'
import { createError } from '../utils/ErrorList'

// Verification tests for P3 (MultiWaySwitch: compiled lowering vs interpreter vs spec).
// Each test asserts PARITY / documented contract. A red test is a confirmed defect.

type Outcome = { status: 'done' | 'hang' | 'threw'; err: string; ctx: any; log: string[] }

const HANG_MS = 400

function settle(p: Promise<Outcome>, log: string[]): Promise<Outcome> {
  return Promise.race([
    p,
    new Promise<Outcome>((r) =>
      setTimeout(() => r({ status: 'hang', err: '-', ctx: undefined, log: [...log] }), HANG_MS),
    ),
  ])
}

function describeErr(e: any): string {
  if (!e) return 'none'
  const kind = e?.isClean ? 'Clean' : (e?.constructor?.name ?? typeof e)
  return `${kind}:${e?.code ?? '-'}:${String(e?.message ?? e).slice(0, 60)}`
}

function stageFn(arity: number, log: string[], id: string, mode: 'ok' | 'throw' = 'ok'): any {
  const push = () => log.push(id)
  if (arity === 0) return function () { push(); if (mode === 'throw') throw new Error('boom ' + id) }
  if (arity === 1) return (ctx: any) => { push(); if (mode === 'throw') throw new Error('boom ' + id); return ctx }
  if (arity === 2) return (ctx: any, done: any) => { push(); done(undefined, ctx) }
  return (err: any, ctx: any, done: any) => { push(); done(undefined, ctx) }
}

// Interpreter path: Pipeline with compile disabled.
function runInterp(build: (log: string[]) => any, err?: any): Promise<Outcome> {
  __setCompiledPipelineEnabledForTests(false)
  const log: string[] = []
  const ctx = { log }
  const pipe = new Pipeline([build(log)] as any)
  const p = new Promise<Outcome>((resolve) => {
    try {
      ;(pipe as any).execute(err, ctx, (e: any, c: any) =>
        resolve({ status: 'done', err: describeErr(e), ctx: c, log: [...log] }))
    } catch (x) {
      resolve({ status: 'threw', err: describeErr(x), ctx, log: [...log] })
    }
  })
  return settle(p, log)
}

// Compiled path: same Pipeline, lowered to a plan and executed by the compiled executor.
function runCompiled(build: (log: string[]) => any, err?: any): Promise<Outcome> {
  __setCompiledPipelineEnabledForTests(true)
  const log: string[] = []
  const ctx = { log }
  const pipe = new Pipeline([build(log)] as any)
  const plan = compilePipelinePlan(pipe as any)
  const p = new Promise<Outcome>((resolve) => {
    try {
      executeCompiledPlan(plan as any, err, ctx as any, (e: any, c: any) =>
        resolve({ status: 'done', err: describeErr(e), ctx: c, log: [...log] }))
    } catch (x) {
      resolve({ status: 'threw', err: describeErr(x), ctx, log: [...log] })
    }
  })
  return settle(p, log)
}

// Direct MWS.execute (interpreter, no Pipeline wrapper).
function runDirect(mws: any, err: any, ctx: any): Promise<Outcome> {
  const log: string[] = []
  const p = new Promise<Outcome>((resolve) => {
    try {
      mws.execute(err, ctx, (e: any, c: any) => resolve({ status: 'done', err: describeErr(e), ctx: c, log }))
    } catch (x) {
      resolve({ status: 'threw', err: describeErr(x), ctx, log })
    }
  })
  return settle(p, log)
}

describe('P3 MultiWaySwitch: compiled lowering vs interpreter', () => {
  // ---- Case filtering by `evaluate` (multiwayswitch.ts:232-244 vs compiler.ts:1025,1496) ----
  for (const [label, value] of [
    ['undefined', undefined],
    ['null', null],
    ['0', 0],
    ["''", ''],
    ["'yes'", 'yes'],
  ] as const) {
    it(`parity: evaluate: ${label} runs the case in both paths`, async () => {
      const build = (log: string[]) =>
        new MultiWaySwitch<any, any>({
          cases: [{ stage: stageFn(1, log, 'c'), evaluate: value as any }],
        } as any)
      const I = await runInterp(build)
      const C = await runCompiled(build)
      expect(C.log).toEqual(['c']) // compiled runs it (evaluate !== false)
      expect(I.log).toEqual(C.log) // interpreter must agree
    })
  }

  // ---- Dynamic evaluate throws (multiwayswitch.ts:258 is outside try at :280) ----
  it('evaluate throws: interpreter settles with an error (compiled does)', async () => {
    const build = (log: string[]) =>
      new MultiWaySwitch<any, any>({
        cases: [
          { stage: stageFn(1, log, 'a'), evaluate: () => true },
          { stage: stageFn(1, log, 'b'), evaluate: () => { throw new Error('ev-throw') } },
        ],
      } as any)
    const C = await runCompiled(build)
    const I = await runInterp(build)
    expect(C.status).toBe('done')
    expect(C.err).toContain('ev-throw')
    expect(I.status).toBe('done') // FAILS: interpreter never calls done (hang)
    expect(I.err).toBe(C.err)
  })

  // ---- combine throws inside the async completion callback (multiwayswitch.ts:307) ----
  it('combine throws in a single async case: interpreter settles with error', async () => {
    const build = (log: string[]) =>
      new MultiWaySwitch<any, any>({
        cases: [
          {
            stage: new Stage({ run: async (ctx: any) => { log.push('a'); return ctx } } as any),
            combine: () => { throw new Error('combine-boom') },
          },
        ],
      } as any)
    const C = await runCompiled(build)
    const I = await runInterp(build)
    expect(C.status).toBe('done')
    expect(I.status).toBe('done') // FAILS: hang
    expect(I.err).toBe(C.err)
  })

  it('combine throws in the fold path (two cases): interpreter settles with error', async () => {
    const build = (log: string[]) =>
      new MultiWaySwitch<any, any>({
        cases: [
          {
            stage: new Stage({ run: async (ctx: any) => { log.push('a'); return ctx } } as any),
            combine: () => { throw new Error('combine-boom') },
            split: (c: any) => ({ ...c }),
          },
          {
            stage: new Stage({ run: async (ctx: any) => { log.push('b'); return ctx } } as any),
            split: (c: any) => ({ ...c }),
          },
        ],
      } as any)
    const C = await runCompiled(build)
    const I = await runInterp(build)
    expect(C.status).toBe('done')
    expect(I.status).toBe('done') // FAILS: hang
    expect(I.err).toBe(C.err)
  })

  // ---- Split throws: interpreter calls done early, siblings still running (try/catch :280-329) ----
  it('split throws in case 2: done must wait for sibling case 1 (no early done)', async () => {
    const flag = { v: false }
    const mws = new MultiWaySwitch<any, any>({
      cases: [
        {
          stage: new Stage({
            run: async (ctx: any) => { await new Promise((r) => setTimeout(r, 40)); flag.v = true; return ctx },
          } as any),
          split: (c: any) => c,
        },
        {
          stage: new Stage({ run: (ctx: any) => ctx } as any),
          split: () => { throw new Error('split-boom') },
        },
      ],
    } as any)
    const out = await new Promise<{ err: any; flagAtDone: boolean }>((resolve) => {
      mws.execute({ x: 1 } as any, (e: any) => resolve({ err: e, flagAtDone: flag.v }))
    })
    expect(out.err).toBeTruthy()
    expect(out.flagAtDone).toBe(true) // FAILS: done fires while sibling still mutates shared ctx
  })

  // ---- Input error handling (e): raw arity-1 function case swallows inbound error ----
  it('direct MWS: inbound error kept when a raw arity-1 case matches (no-match keeps it)', async () => {
    const matched = await runDirect(
      new MultiWaySwitch<any, any>({ cases: [{ stage: (ctx: any) => ctx }] } as any),
      createError('input-err'),
      {},
    )
    const noMatch = await runDirect(
      new MultiWaySwitch<any, any>({ cases: [{ stage: (ctx: any) => ctx, evaluate: false }] } as any),
      createError('input-err'),
      {},
    )
    expect(noMatch.err).toContain('input-err') // reference: no-match keeps error
    expect(matched.err).toBe(noMatch.err) // FAILS: matched case returns err=none
  })

  it('compiled Pipeline([fn1]) without MWS keeps inbound error (general lowering check)', async () => {
    const build = (log: string[]) => new Pipeline([stageFn(1, log, 'p')] as any)
    const I = await runInterp(build, createError('input-err'))
    const C = await runCompiled(build, createError('input-err'))
    expect(I.err).toContain('input-err')
    expect(C.err).toBe(I.err) // FAILS: compiled returns none (not MWS-specific)
  })

  // Pipeline-wrapped interpreter masks the MWS loss (Pipeline keeps the inbound error itself),
  // so the contract is asserted directly: a matched case must not swallow the inbound error.
  it('compiled MWS matched raw arity-1 case: inbound error is not swallowed', async () => {
    const build = (log: string[]) =>
      new MultiWaySwitch<any, any>({ cases: [{ stage: stageFn(1, log, 'm') }] } as any)
    const C = await runCompiled(build, createError('input-err'))
    expect(C.err).toContain('input-err') // FAILS: compiled returns none
  })

  // ---- Error-shape / passing references (must stay green) ----
  it('single matched throwing case: both paths give CleanError ERR_STAGE_THROW', async () => {
    const build = (log: string[]) =>
      new MultiWaySwitch<any, any>({ cases: [{ stage: stageFn(1, log, 't', 'throw') }] } as any)
    const I = await runInterp(build)
    const C = await runCompiled(build)
    expect(I.err).toContain('ERR_STAGE_THROW')
    expect(C.err).toBe(I.err)
  })

  it('fold: two async combines both land in accumulated result (both paths)', async () => {
    const build = (_log: string[]) =>
      new MultiWaySwitch<any, any>({
        cases: [
          {
            stage: new Stage({ run: async () => { await new Promise((r) => setTimeout(r, 20)); return { m: 'A' } } } as any),
            combine: (acc: any, r: any) => ({ ...acc, A: r.m }),
          },
          {
            stage: new Stage({ run: async () => ({ m: 'B' }) } as any),
            combine: (acc: any, r: any) => ({ ...acc, B: r.m }),
          },
        ],
      } as any)
    const I = await new Promise<any>((res) => {
      __setCompiledPipelineEnabledForTests(false)
      new Pipeline([build([])] as any).execute({}, (e: any, c: any) => res(c))
    })
    const C = await new Promise<any>((res) => {
      __setCompiledPipelineEnabledForTests(true)
      const plan = compilePipelinePlan(new Pipeline([build([])] as any) as any)
      executeCompiledPlan(plan as any, undefined, {} as any, (e: any, c: any) => res(c))
    })
    expect(I).toEqual({ A: 'A', B: 'B' })
    expect(C).toEqual(I)
  })

  it('no-match with inbound error keeps the error in both paths', async () => {
    const build = (log: string[]) =>
      new MultiWaySwitch<any, any>({ cases: [{ stage: stageFn(1, log, 'n'), evaluate: false }] } as any)
    const I = await runInterp(build, createError('input-err'))
    const C = await runCompiled(build, createError('input-err'))
    expect(I.err).toContain('input-err')
    expect(C.err).toBe(I.err)
  })

  it('empty stage form with inbound error: both paths propagate an error', async () => {
    const build = (_log: string[]) =>
      new MultiWaySwitch<any, any>({ cases: [{ stage: new Empty({ name: 'e' } as any) }] } as any)
    const I = await runInterp(build, createError('input-err'))
    const C = await runCompiled(build, createError('input-err'))
    expect(I.err).not.toBe('none')
    expect(C.err).toBe(I.err) // FAILS: compiled returns none for Empty with inbound error
  })

  // Double done() from a sync callback-style case: interpreter reports ERR_CALLBACK_DOUBLE
  // (run_callback_once contract); compiled path completes successfully and drops the violation.
  it('single case calling done twice: both paths report the double-call error', async () => {
    const build = (log: string[]) =>
      new MultiWaySwitch<any, any>({
        cases: [
          {
            stage: (ctx: any, done: any) => {
              log.push('dd')
              done(undefined, ctx)
              done(undefined, ctx)
            },
          },
        ],
      } as any)
    const I = await runInterp(build)
    const C = await runCompiled(build)
    expect(I.err).toContain('ERR_CALLBACK_DOUBLE')
    expect(C.err).toBe(I.err) // FAILS: compiled err=none
  })

  it('combine returning undefined resets accumulation identically in both paths', async () => {
    const build = (_log: string[]) =>
      new MultiWaySwitch<any, any>({
        cases: [
          {
            stage: new Stage({ run: async () => ({ a: 1 }) } as any),
            combine: () => undefined,
            split: (c: any) => ({ ...c }),
          },
          {
            stage: new Stage({ run: async () => { await new Promise((r) => setTimeout(r, 10)); return { b: 2 } } } as any),
            combine: (acc: any, r: any) => ({ ...acc, ...r }),
            split: (c: any) => ({ ...c }),
          },
        ],
      } as any)
    const I = await new Promise<any>((res) => {
      __setCompiledPipelineEnabledForTests(false)
      new Pipeline([build([])] as any).execute({ z: 0 }, (e: any, c: any) => res(c))
    })
    const C = await new Promise<any>((res) => {
      __setCompiledPipelineEnabledForTests(true)
      const plan = compilePipelinePlan(new Pipeline([build([])] as any) as any)
      executeCompiledPlan(plan as any, undefined, { z: 0 } as any, (e: any, c: any) => res(c))
    })
    expect(C).toEqual(I)
    expect(I).toEqual({ z: 0, b: 2 })
  })
})
