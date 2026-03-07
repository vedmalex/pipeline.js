import { createError } from '../utils/ErrorList'
import { isPromise } from '../utils/TypeDetectors'
import { process_error } from '../utils/process_error'
import { run_or_execute } from '../utils/run_or_execute'
import { run_callback_once } from '../utils/run_callback_once'
import { CallbackFunction, is_thenable, Possible, StageObject } from '../utils/types'
import { CompiledPlan, ExecutionState, Frame } from './plan'

function createExecutionState<T extends StageObject>(
  plan: CompiledPlan<T>,
  err: Possible<Error>,
  context: T,
  done: CallbackFunction<T>,
): ExecutionState<T> {
  return {
    plan,
    pc: plan.entry,
    inputErr: err as any,
    ctx: context,
    err: undefined,
    result: undefined,
    frameStack: [{ kind: 'ROOT' } satisfies Frame],
    suspended: false,
    completed: false,
    done,
    yielded: 0,
  }
}

function completeState<T extends StageObject>(state: ExecutionState<T>) {
  if (state.completed) return
  state.completed = true
  state.done(state.err, state.ctx)
}

function failState<T extends StageObject>(state: ExecutionState<T>, error: unknown) {
  state.err = createError(error instanceof Error ? error : String(error))
  state.result = undefined
  state.suspended = false
  state.pc = state.plan.errorExit
}

function runWithStage<T extends StageObject>(
  state: ExecutionState<T>,
  stage: any,
) {
  let sync = true

  run_or_execute(stage, state.inputErr as any, state.ctx, ((err, ctx) => {
    if (state.completed) return

    state.err = err
    state.result = err ? undefined : ((ctx ?? state.ctx) as T)
    state.pc = err ? state.plan.errorExit : state.pc + 1
    state.suspended = false

    if (!sync) {
      executeCompiledPlanLoop(state)
    }
  }) as CallbackFunction<T>)

  sync = false
}

function completeOp<T extends StageObject>(
  state: ExecutionState<T>,
  err: Possible<Error>,
  ctx: T | undefined,
  sync: boolean,
) {
  if (state.completed) return

  state.err = err as any
  state.result = err ? undefined : ((ctx ?? state.ctx) as T)
  state.pc = err ? state.plan.errorExit : state.pc + 1
  state.suspended = false

  if (!sync) {
    executeCompiledPlanLoop(state)
  }
}

function runCompiledStageFn<T extends StageObject>(
  state: ExecutionState<T>,
  stageFnId: number,
) {
  const run = state.plan.tables.stageFns[stageFnId]
  const kind = state.plan.tables.stageFnKinds[stageFnId] ?? 'GENERIC'
  let sync = true

  const settle = ((err?: Possible<Error>, ctx?: T) => {
    completeOp(state, err, ctx, sync)
  }) as CallbackFunction<T>

  switch (kind) {
    case 'FN0_ASYNC': {
      try {
        ;(run as () => Promise<T>).call(state.ctx)
          .then(res => settle(undefined, (res ?? state.ctx) as T))
          .catch(err => settle(err))
      } catch (err) {
        process_error(err, settle)
      }
      break
    }

    case 'FN0_SYNC': {
      try {
        const res = (run as () => unknown).call(state.ctx)
        if (isPromise(res) || is_thenable(res)) {
          res
            .then(value => settle(undefined, (value ?? state.ctx) as T))
            .catch(err => settle(err))
        } else {
          settle(undefined, (res ?? state.ctx) as T)
        }
      } catch (err) {
        process_error(err, settle)
      }
      break
    }

    case 'FN1_ASYNC': {
      try {
        ;(run as (ctx: T) => Promise<T>)(state.ctx)
          .then(ctx => settle(undefined, ctx))
          .catch(err => settle(err))
      } catch (err) {
        process_error(err, settle)
      }
      break
    }

    case 'FN1_SYNC': {
      try {
        const res = (run as (ctx: T) => unknown)(state.ctx)
        if (isPromise(res) || is_thenable(res)) {
          res.then(value => settle(undefined, value as T)).catch(err => settle(err))
        } else {
          settle(undefined, res as T)
        }
      } catch (err) {
        process_error(err, settle)
      }
      break
    }

    case 'FN2_ASYNC': {
      try {
        ;(run as (err: Possible<Error>, ctx: T) => Promise<T>)(state.inputErr, state.ctx)
          .then(ctx => settle(undefined, ctx))
          .catch(err => settle(err))
      } catch (err) {
        process_error(err, settle)
      }
      break
    }

    case 'FN2_CALLBACK': {
      const done = run_callback_once(settle)
      try {
        ;(run as (ctx: T, done: CallbackFunction<T>) => void)(state.ctx, done)
      } catch (err) {
        process_error(err, done)
      }
      break
    }

    case 'FN3_CALLBACK': {
      const done = run_callback_once(settle)
      try {
        ;(run as (err: Possible<Error>, ctx: T, done: CallbackFunction<T>) => void)(
          state.inputErr,
          state.ctx,
          done,
        )
      } catch (err) {
        process_error(err, done)
      }
      break
    }

    case 'GENERIC':
    default: {
      runWithStage(state, run)
      sync = false
      return
    }
  }

  sync = false
}

function executeCompiledPlanLoop<T extends StageObject>(state: ExecutionState<T>) {
  while (!state.suspended && !state.completed) {
    const op = state.plan.ops[state.pc]

    if (!op) {
      failState(state, 'compiled executor pc out of bounds')
      continue
    }

    switch (op.op) {
      case 'RUN_STAGE_FN': {
        state.suspended = true
        runCompiledStageFn(state, op.stageFnId)
        if (state.suspended) return
        continue
      }

      case 'RUN_STAGE_INSTANCE': {
        state.suspended = true
        runWithStage(state, state.plan.tables.stageInstances[op.stageId])
        if (state.suspended) return
        continue
      }

      case 'RUN_FALLBACK_STAGE': {
        state.suspended = true
        runWithStage(state, state.plan.tables.stageInstances[op.stageId])
        if (state.suspended) return
        continue
      }

      case 'SET_CTX_FROM_RESULT': {
        if (!state.err && state.result !== undefined) {
          state.ctx = state.result
        }
        state.result = undefined
        state.pc += 1
        continue
      }

      case 'JUMP': {
        state.pc = op.target
        continue
      }

      case 'JUMP_IF_TRUE':
      case 'PUSH_FRAME':
      case 'POP_FRAME': {
        failState(state, `opcode ${op.op} is not implemented in phase 1 executor`)
        continue
      }

      case 'RETURN': {
        completeState(state)
        return
      }
    }
  }
}

export function executeCompiledPlan<T extends StageObject>(
  plan: CompiledPlan<T>,
  err: Possible<Error>,
  context: T,
  done: CallbackFunction<T>,
) {
  const state = createExecutionState(plan, err, context, done)
  executeCompiledPlanLoop(state)
}
