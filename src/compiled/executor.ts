import { createError } from '../utils/ErrorList'
import { run_or_execute } from '../utils/run_or_execute'
import { CallbackFunction, Possible, StageObject } from '../utils/types'
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
        runWithStage(state, state.plan.tables.stageFns[op.stageFnId])
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
