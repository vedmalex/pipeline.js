import {
  bindExecutionSignal,
  createLinkedAbortController,
  getExecutionSignal,
} from '../execution_signal'
import { type CleanError, createCodeError, createError } from '../utils/ErrorList'
import { commitIsolatedStageContext, createIsolatedStageContext } from '../utils/context_snapshot'
import { ErrorCode, ErrorMessage, type ErrorCodeType } from '../utils/errors'
import { execute_validate } from '../utils/execute_validate'
import { isPromise } from '../utils/TypeDetectors'
import { process_error } from '../utils/process_error'
import { run_or_execute } from '../utils/run_or_execute'
import { run_callback_once } from '../utils/run_callback_once'
import { warnOnce } from '../utils/warn_once'
import { CallbackExternalFunction, CallbackFunction, is_thenable, Possible, RunPipelineFunction, StageObject, ValidateFunction } from '../utils/types'
import {
  CompiledPlan,
  CompiledPredicateKind,
  ExecutionState,
  Frame,
  LoopPlanData,
  MultiWaySwitchPlanData,
  ParallelPlanData,
  PredicateResult,
  RetryPlanData,
  SequentialPlanData,
  TimeoutPlanData,
} from './plan'

export type ExecutableMultiWaySwitchStaticCase = {
  stage: unknown
  split?: (ctx: any) => any
  combine?: (ctx: any, retCtx: any) => any
  run: RunPipelineFunction<any>
}

export type ExecutableMultiWaySwitchDynamicCase =
  ExecutableMultiWaySwitchStaticCase & {
    evaluate: (ctx: any) => any
  }

export type ExecutableMultiWaySwitchData = {
  statics: ExecutableMultiWaySwitchStaticCase[]
  dynamics: ExecutableMultiWaySwitchDynamicCase[]
}

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

function removeFrame<T extends StageObject>(state: ExecutionState<T>, frame: Frame) {
  if (state.frameStack[state.frameStack.length - 1] === frame) {
    state.frameStack.pop()
  }
}

function unwindFramesOnError<T extends StageObject>(state: ExecutionState<T>) {
  while (state.frameStack.length > 1) {
    const top = state.frameStack[state.frameStack.length - 1]

    if (top?.kind === 'SUBPLAN_RETURN') {
      return
    }

    const frame = state.frameStack.pop()

    if (!frame) {
      return
    }

    switch (frame.kind) {
      case 'SCOPE':
        state.inputErr = frame.inputErr
        break
      case 'WRAP':
        state.ctx = frame.originalCtx
        break
      case 'SEQUENTIAL':
        state.ctx = frame.originalCtx
        break
      case 'LOOP':
        state.ctx = frame.currentCtx
        break
      case 'RETRY_STATE':
        state.ctx = frame.currentCtx
        break
      case 'TIMEOUT':
        state.ctx = frame.originalCtx
        frame.controllerCleanup?.()
        frame.controllerCleanup = null
        if (frame.controller && !frame.controller.signal.aborted) {
          frame.controller.abort(createCodeError(ErrorCode.ERR_STAGE_TIMEOUT))
        }
        if (frame.timer) {
          clearTimeout(frame.timer)
          frame.timer = null
        }
        frame.settled = true
        break
      case 'PARALLEL':
        state.ctx = frame.originalCtx
        if (frame.drainTimer) {
          clearTimeout(frame.drainTimer)
          frame.drainTimer = null
        }
        for (const cleanup of frame.controllerCleanups) {
          cleanup?.()
        }
        for (const controller of frame.controllers) {
          if (controller && !controller.signal.aborted) {
            controller.abort(createCodeError(ErrorCode.ERR_STAGE_ABORTED))
          }
        }
        frame.settled = true
        break
      default:
        break
    }
  }
}

function setExecutionError<T extends StageObject>(
  state: ExecutionState<T>,
  err: Possible<Error>,
) {
  state.err = err ? (createError(err as any) as any) : (err as any)
  state.result = undefined
  state.suspended = false
  unwindFramesOnError(state)
  state.pc = state.plan.errorExit
}

function failState<T extends StageObject>(
  state: ExecutionState<T>,
  error: unknown,
  code?: ErrorCodeType,
) {
  state.err = createError(error instanceof Error ? error : String(error), code)
  state.result = undefined
  state.suspended = false
  unwindFramesOnError(state)
  state.pc = state.plan.errorExit
}

function completePrimitiveSuccess<T extends StageObject>(
  state: ExecutionState<T>,
  ctx: T,
) {
  state.err = undefined
  state.result = undefined
  state.ctx = ctx
  state.suspended = false
  state.pc = state.pc + 1
}

function completePrimitiveError<T extends StageObject>(
  state: ExecutionState<T>,
  err: Possible<Error>,
  ctx?: T,
) {
  if (ctx !== undefined) {
    state.ctx = ctx
  }

  setExecutionError(state, err)
}

function failPrimitive<T extends StageObject>(
  state: ExecutionState<T>,
  error: unknown,
  ctx?: T,
  code?: ErrorCodeType,
) {
  if (ctx !== undefined) {
    state.ctx = ctx
  }

  failState(state, error, code)
}

export function invokeStageFn<T extends StageObject>(
  plan: CompiledPlan<T>,
  stageFnId: number,
  inputErr: Possible<Error>,
  context: T,
  done: CallbackFunction<T>,
  signal?: AbortSignal,
) {
  const run = plan.tables.stageFns[stageFnId]
  const kind = plan.tables.stageFnKinds[stageFnId] ?? 'GENERIC'
  const effectiveSignal = signal ?? getExecutionSignal(context)

  if (!effectiveSignal) {
    invokeStageFnDispatch(run, kind, inputErr, context, done, undefined)
    return
  }

  const cleanup = bindExecutionSignal(context, effectiveSignal)
  const finish = ((err?: Possible<Error>, ctx?: T) => {
    cleanup()
    done(err as any, ctx)
  }) as CallbackFunction<T>

  invokeStageFnDispatch(run, kind, inputErr, context, finish, effectiveSignal)
}

function invokeStageFnDispatch<T extends StageObject>(
  run: any,
  kind: string,
  inputErr: Possible<Error>,
  context: T,
  done: CallbackFunction<T>,
  signal?: AbortSignal,
) {
  switch (kind) {
    case 'FN0_ASYNC': {
      try {
        ;(run as () => Promise<T>).call(context)
          .then(res => done(undefined, (res ?? context) as T))
          .catch(err => done(err))
      } catch (err) {
        process_error(err, done)
      }
      return
    }

    case 'FN0_SYNC': {
      try {
        const res = (run as () => unknown).call(context)
        if (isPromise(res) || is_thenable(res)) {
          res
            .then(value => done(undefined, (value ?? context) as T))
            .catch(err => done(err))
        } else {
          done(undefined, (res ?? context) as T)
        }
      } catch (err) {
        process_error(err, done)
      }
      return
    }

    case 'FN1_ASYNC': {
      try {
        ;(run as (ctx: T) => Promise<T>)(context)
          .then(ctx => done(undefined, ctx))
          .catch(err => done(err))
      } catch (err) {
        process_error(err, done)
      }
      return
    }

    case 'FN1_SYNC': {
      try {
        const res = (run as (ctx: T) => unknown)(context)
        if (isPromise(res) || is_thenable(res)) {
          res.then(value => done(undefined, value as T)).catch(err => done(err))
        } else {
          done(undefined, res as T)
        }
      } catch (err) {
        process_error(err, done)
      }
      return
    }

    case 'FN2_ASYNC': {
      try {
        ;(run as (err: Possible<Error>, ctx: T) => Promise<T>)(inputErr, context)
          .then(ctx => done(undefined, ctx))
          .catch(err => done(err))
      } catch (err) {
        process_error(err, done)
      }
      return
    }

    case 'FN2_CALLBACK': {
      let callbackCalled = false
      const callback = run_callback_once(((err, ctx) => {
        callbackCalled = true
        done(err, ctx)
      }) as CallbackFunction<T>)
      try {
        ;(run as (ctx: T, done: CallbackFunction<T>) => void)(context, callback)
      } catch (err) {
        if (!callbackCalled) {
          process_error(err, callback)
        }
      }
      return
    }

    case 'FN3_CALLBACK': {
      let callbackCalled = false
      const callback = run_callback_once(((err, ctx) => {
        callbackCalled = true
        done(err, ctx)
      }) as CallbackFunction<T>)
      try {
        ;(run as (err: Possible<Error>, ctx: T, done: CallbackFunction<T>) => void)(
          inputErr,
          context,
          callback,
        )
      } catch (err) {
        if (!callbackCalled) {
          process_error(err, callback)
        }
      }
      return
    }

    case 'GENERIC':
    default:
      run_or_execute(run as any, inputErr as any, context, done, signal)
  }
}

export function executeFusedStageFnSequence<T extends StageObject>(
  plan: CompiledPlan<T>,
  stageFnIds: number[],
  inputErr: Possible<CleanError>,
  initialCtx: T,
  done: CallbackFunction<T>,
) {
  let currentCtx = initialCtx
  let index = 0
  let completed = false

  const finish = (err?: Possible<CleanError>, ctx?: T) => {
    if (completed) {
      return
    }

    completed = true
    done(err as any, ctx)
  }

  const advance = () => {
    while (!completed && index < stageFnIds.length) {
      const stageFnId = stageFnIds[index]
      let sync = true
      let settledSync = false
      let syncErr: Possible<CleanError>
      let syncCtx: T | undefined

      invokeStageFn(plan, stageFnId, inputErr, currentCtx, ((err, ctx) => {
        if (completed) {
          return
        }

        if (sync) {
          settledSync = true
          syncErr = err
          syncCtx = ctx
          return
        }

        if (err) {
          finish(err, currentCtx)
          return
        }

        currentCtx = (ctx ?? currentCtx) as T
        index += 1
        advance()
      }) as CallbackFunction<T>)

      sync = false

      if (!settledSync) {
        return
      }

      if (syncErr) {
        finish(syncErr, currentCtx)
        return
      }

      currentCtx = (syncCtx ?? currentCtx) as T
      index += 1
    }

    if (!completed) {
      finish(undefined, currentCtx)
    }
  }

  advance()
}

function runWithStage<T extends StageObject>(
  state: ExecutionState<T>,
  stage: any,
) {
  let sync = true

  run_or_execute(stage, state.inputErr as any, state.ctx, ((err, ctx) => {
    if (state.completed) return

    state.result = err ? undefined : ((ctx ?? state.ctx) as T)
    state.suspended = false

    if (err) {
      setExecutionError(state, err)
    } else {
      state.err = undefined
      state.pc = state.pc + 1
    }

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

  state.result = err ? undefined : ((ctx ?? state.ctx) as T)
  state.suspended = false

  if (err) {
    setExecutionError(state, err)
  } else {
    state.err = undefined
    state.pc = state.pc + 1
  }

  if (!sync) {
    executeCompiledPlanLoop(state)
  }
}

function wrapMultiWaySwitchCaseError(
  actuals: Array<ExecutableMultiWaySwitchStaticCase | ExecutableMultiWaySwitchDynamicCase>,
  index: number,
  err: unknown,
  ctx: unknown,
) {
  return new Error('mws - error', {
    cause: {
      err,
      ctx,
      actuals,
      index,
    },
  })
}

function runSingleMultiWaySwitchCase<T extends StageObject>(
  initialErr: Possible<CleanError>,
  initialCtx: T,
  actuals: Array<ExecutableMultiWaySwitchStaticCase | ExecutableMultiWaySwitchDynamicCase>,
  caseItem: ExecutableMultiWaySwitchStaticCase | ExecutableMultiWaySwitchDynamicCase,
  done: CallbackFunction<T>,
) {
  let localCtx: any

  try {
    localCtx = typeof caseItem.split === 'function'
      ? caseItem.split(initialCtx)
      : initialCtx
  } catch (splitErr) {
    done(wrapMultiWaySwitchCaseError(actuals, 0, splitErr, initialCtx) as any, initialCtx)
    return
  }

  run_or_execute(caseItem.run as any, initialErr as any, localCtx, ((err, retCtx) => {
    if (err) {
      done(wrapMultiWaySwitchCaseError(actuals, 0, err, localCtx) as any, initialCtx)
      return
    }

    try {
      const resultContext = typeof caseItem.combine === 'function'
        ? caseItem.combine(initialCtx, retCtx)
        : initialCtx
      done(undefined, (resultContext ?? initialCtx) as T)
    } catch (combineErr) {
      done(wrapMultiWaySwitchCaseError(actuals, 0, combineErr, localCtx) as any, initialCtx)
    }
  }) as CallbackFunction<T>)
}

export function executeNativeMultiWaySwitch<T extends StageObject>(
  initialErr: Possible<CleanError>,
  initialCtx: T,
  data: ExecutableMultiWaySwitchData,
  done: CallbackFunction<T>,
) {
  const statics = data.statics ?? []
  const dynamics = data.dynamics ?? []

  if (statics.length === 0 && dynamics.length === 0) {
    done(initialErr, initialCtx)
    return
  }

  if (statics.length === 1 && dynamics.length === 0) {
    runSingleMultiWaySwitchCase(initialErr, initialCtx, [statics[0]], statics[0], done)
    return
  }

  if (statics.length === 0 && dynamics.length === 1) {
    let matched = false

    try {
      matched = !!dynamics[0].evaluate(initialCtx as T)
    } catch (err) {
      done(createError(err as any, ErrorCode.ERR_STAGE_THROW) as any, initialCtx)
      return
    }

    if (!matched) {
      done(initialErr, initialCtx)
      return
    }

    runSingleMultiWaySwitchCase(initialErr, initialCtx, [dynamics[0]], dynamics[0], done)
    return
  }

  const actuals: Array<ExecutableMultiWaySwitchStaticCase | ExecutableMultiWaySwitchDynamicCase> = []
  actuals.push(...statics)

  for (let i = 0; i < dynamics.length; i++) {
    try {
      if (dynamics[i].evaluate(initialCtx as T)) {
        actuals.push(dynamics[i])
      }
    } catch (err) {
      done(createError(err as any, ErrorCode.ERR_STAGE_THROW) as any, initialCtx)
      return
    }
  }

  if (actuals.length === 0) {
    done(initialErr, initialCtx)
    return
  }

  if (actuals.length === 1) {
    runSingleMultiWaySwitchCase(initialErr, initialCtx, actuals, actuals[0], done)
    return
  }

  if (actuals.some((item) => typeof item.combine === 'function')) {
    warnOnce(
      'mws-multi-combine-order',
      '[pipeline.js] MultiWaySwitch: multiple matching cases with combine functions are folded in async completion order. Make combine commutative or use Sequential if order matters.',
    )
  }

  const hasCustomSplitOrCombine = actuals.some((item) =>
    typeof item.split === 'function' || typeof item.combine === 'function',
  )

  if (!hasCustomSplitOrCombine) {
    let pending = actuals.length
    let completed = false
    const errorSlots: Array<unknown | undefined> = new Array(actuals.length)

    const finish = (err?: unknown, ctx?: T) => {
      if (completed) {
        return
      }

      completed = true
      done(err as any, ctx)
    }

    const maybeComplete = () => {
      if (completed || pending > 0) {
        return
      }

      const errors = errorSlots.filter((value): value is unknown => value !== undefined)

      if (errors.length > 0) {
        finish(createError(errors as any), initialCtx)
      } else {
        finish(undefined, initialCtx)
      }
    }

    for (let i = 0; i < actuals.length; i++) {
      run_or_execute(actuals[i].run as any, initialErr as any, initialCtx, ((err: unknown) => {
        if (completed) {
          return
        }

        if (err) {
          errorSlots[i] = wrapMultiWaySwitchCaseError(actuals, i, err, initialCtx)
        }

        pending -= 1
        maybeComplete()
      }) as CallbackFunction<any>)
    }
    return
  }

  let pending = actuals.length
  let completed = false
  let resultContext: T | null = null
  let firstError: unknown | undefined
  let firstErrorIndex = -1
  let errorSlots: Array<unknown | undefined> | null = null

  const finish = (err?: unknown, ctx?: T) => {
    if (completed) {
      return
    }

    completed = true
    done(err as any, ctx)
  }

  const maybeComplete = () => {
    if (completed || pending > 0) {
      return
    }

    if (errorSlots) {
      const errors = errorSlots.filter((value): value is unknown => value !== undefined)
      finish(createError(errors as any), initialCtx)
    } else if (firstError !== undefined) {
      finish(createError(firstError as any), initialCtx)
    } else {
      finish(undefined, (resultContext ?? initialCtx) as T)
    }
  }

  const storeCaseError = (index: number, err: unknown, ctx: unknown) => {
    const wrappedError = wrapMultiWaySwitchCaseError(actuals, index, err, ctx)

    if (errorSlots) {
      errorSlots[index] = wrappedError
      return
    }

    if (firstError === undefined) {
      firstError = wrappedError
      firstErrorIndex = index
      return
    }

    errorSlots = new Array(actuals.length)
    errorSlots[firstErrorIndex] = firstError
    errorSlots[index] = wrappedError
    firstError = undefined
  }

  for (let i = 0; i < actuals.length; i++) {
    const caseItem = actuals[i]
    let localCtx: any

    try {
      localCtx = typeof caseItem.split === 'function'
        ? caseItem.split(initialCtx)
        : initialCtx
    } catch (err) {
      storeCaseError(i, err, initialCtx)
      pending -= 1
      maybeComplete()
      continue
    }

    run_or_execute(caseItem.run as any, initialErr as any, localCtx, ((err: unknown, retCtx?: T) => {
      if (completed) {
        return
      }

      try {
        if (err) {
          storeCaseError(i, err, localCtx)
        } else if (typeof caseItem.combine === 'function') {
          resultContext = caseItem.combine((resultContext ?? initialCtx) as any, retCtx as any)
        } else {
          resultContext = (resultContext ?? initialCtx) as T
        }
      } catch (combineErr) {
        storeCaseError(i, combineErr, localCtx)
      }

      pending -= 1
      maybeComplete()
    }) as CallbackFunction<any>)
  }
}

function runCompiledStageFn<T extends StageObject>(
  state: ExecutionState<T>,
  stageFnId: number,
) {
  let sync = true

  invokeStageFn(state.plan, stageFnId, state.inputErr, state.ctx, ((err, ctx) => {
    completeOp(state, err, ctx, sync)
  }) as CallbackFunction<T>)

  sync = false
}

function invokeSubplan<T extends StageObject>(
  state: ExecutionState<T>,
  plan: CompiledPlan<any>,
  inputErr: Possible<Error>,
  context: any,
  sequentialFrameIndex: number,
  childIndex: number,
  childCtx: any,
) {
  state.frameStack.push({
    kind: 'SUBPLAN_RETURN',
    parentPlan: state.plan,
    parentPc: state.pc,
    parentInputErr: state.inputErr as any,
    sequentialFrameIndex,
    childIndex,
    childCtx,
  })

  state.plan = plan as any
  state.pc = plan.entry
  state.inputErr = inputErr as any
  state.ctx = context
  state.err = undefined
  state.result = undefined
  state.suspended = false
}

function returnFromSubplan<T extends StageObject>(state: ExecutionState<T>) {
  const frame = state.frameStack[state.frameStack.length - 1]

  if (!frame || frame.kind !== 'SUBPLAN_RETURN') {
    return false
  }

  state.frameStack.pop()

  const childErr = state.err
  const childCtx = state.ctx

  state.plan = frame.parentPlan as any
  state.pc = frame.parentPc
  state.inputErr = frame.parentInputErr as any
  state.err = undefined
  state.result = undefined
  state.suspended = false

  const sequentialFrame = state.frameStack[frame.sequentialFrameIndex]

  if (!sequentialFrame || sequentialFrame.kind !== 'SEQUENTIAL') {
    failState(
      state,
      `${ErrorMessage[ErrorCode.ERR_OPCODE_NOT_IMPL]}: SUBPLAN_RETURN/${frame.sequentialFrameIndex}`,
      ErrorCode.ERR_OPCODE_NOT_IMPL,
    )
    return true
  }

  if (childErr) {
    removeFrame(state, sequentialFrame)
    completePrimitiveError(
      state,
      createSequentialIterationError(sequentialFrame, childErr, frame.childCtx) as any,
      sequentialFrame.originalCtx,
    )
    return true
  }

  sequentialFrame.results[frame.childIndex] = (childCtx ?? frame.childCtx) as T
  sequentialFrame.index = frame.childIndex + 1
  state.suspended = true
  continueSequentialFrame(state, sequentialFrame)
  return true
}

function normalizePredicateResult(result: any): PredicateResult {
  if (typeof result === 'object' && result !== null && 'value' in result) {
    return {
      value: !!result.value,
      err: result.err as any,
    }
  }

  return {
    value: !!result,
  }
}

function dispatchPredicate<T extends StageObject>(
  predicate: (...args: any[]) => any,
  kind: CompiledPredicateKind,
  ctx: T,
  inputErr: Possible<CleanError>,
  settle: (result: PredicateResult) => void,
) {
  try {
    if (kind === 'BOOL_CTX_SYNC') {
      const result = (
        predicate as (ctx: T, err?: Possible<CleanError>) => boolean | Promise<boolean>
      )(ctx, inputErr)

      if (isPromise(result) || is_thenable(result)) {
        result.then((value) => settle({ value: !!value })).catch(() => settle({ value: false }))
      } else {
        settle({ value: !!result })
      }
      return
    }

    if (kind === 'GENERIC_CALLBACK') {
      execute_validate(
        predicate as ValidateFunction<T>,
        ctx,
        ((err, value) => {
          settle({
            value: !!value,
            err: err as any,
          })
        }) as CallbackExternalFunction<boolean>,
      )
      return
    }

    const result = (
      predicate as (
        ctx: T,
        err?: Possible<CleanError>,
      ) => PredicateResult | Promise<PredicateResult>
    )(ctx, inputErr)

    if (isPromise(result) || is_thenable(result)) {
      result.then((value) => settle(normalizePredicateResult(value))).catch((err) => settle({ value: false, err }))
    } else {
      settle(normalizePredicateResult(result))
    }
  } catch (err) {
    if (kind === 'BOOL_CTX_SYNC') {
      settle({ value: false })
    } else {
      settle({ value: false, err: err as any })
    }
  }
}

export function executeInlineControlFlowSubplan<T extends StageObject>(
  plan: CompiledPlan<T>,
  inputErr: Possible<CleanError>,
  initialCtx: T,
  done: CallbackFunction<T>,
) {
  let currentCtx = initialCtx
  let currentErr = inputErr
  let currentResult: T | undefined
  let pc = plan.entry
  let completed = false

  const finish = (err?: Possible<CleanError>, ctx?: T) => {
    if (completed) {
      return
    }

    completed = true
    done(err as any, ctx)
  }

  const advance = () => {
    while (!completed) {
      const op = plan.ops[pc]

      if (!op) {
        finish(
          createCodeError(ErrorCode.ERR_PC_OUT_OF_BOUNDS, `inline-subplan/${pc}`) as any,
          currentCtx,
        )
        return
      }

      switch (op.op) {
        case 'RUN_STAGE_FN': {
          const resumePc = pc + 1
          let sync = true
          let settledSync = false
          let syncErr: Possible<CleanError>
          let syncCtx: T | undefined

          invokeStageFn(plan, op.stageFnId, currentErr, currentCtx, ((err, ctx) => {
            if (completed) {
              return
            }

            if (sync) {
              settledSync = true
              syncErr = err
              syncCtx = ctx
              return
            }

            if (err) {
              finish(err, currentCtx)
              return
            }

            currentResult = (ctx ?? currentCtx) as T
            pc = resumePc
            advance()
          }) as CallbackFunction<T>)

          sync = false

          if (!settledSync) {
            return
          }

          if (syncErr) {
            finish(syncErr, currentCtx)
            return
          }

          currentResult = (syncCtx ?? currentCtx) as T
          pc = resumePc
          continue
        }

        case 'SET_CTX_FROM_RESULT':
          if (currentResult !== undefined) {
            currentCtx = currentResult
          }
          currentResult = undefined
          pc += 1
          continue

        case 'JUMP':
          pc = op.target
          continue

        case 'JUMP_IF_TRUE': {
          const predicate = plan.tables.predicates[op.predicateId]
          const kind = (plan.tables.predicateKinds[op.predicateId] ?? 'GENERIC') as CompiledPredicateKind

          if (!predicate) {
            finish(
              createCodeError(ErrorCode.ERR_OPCODE_NOT_IMPL, `predicate ${op.predicateId}`) as any,
              currentCtx,
            )
            return
          }

          const falseTarget = pc + 1
          const trueTarget = op.target
          let sync = true
          let settledSync = false
          let syncTarget = falseTarget
          let syncErr: Possible<CleanError>

          const settle = (result: PredicateResult) => {
            if (completed) {
              return
            }

            if (result.err !== undefined) {
              currentErr = result.err
            }

            if (sync) {
              settledSync = true
              syncTarget = result.value ? trueTarget : falseTarget
              syncErr = result.err
              return
            }

            pc = result.value ? trueTarget : falseTarget
            advance()
          }

          dispatchPredicate(predicate as any, kind, currentCtx, currentErr, settle)

          sync = false

          if (!settledSync) {
            return
          }

          if (syncErr !== undefined) {
            currentErr = syncErr
          }
          pc = syncTarget
          continue
        }

        case 'RETURN':
          finish(undefined, currentCtx)
          return

        default:
          finish(
            createCodeError(ErrorCode.ERR_OPCODE_NOT_IMPL, `inline-subplan/${op.op}`) as any,
            currentCtx,
          )
          return
      }
    }
  }

  advance()
}

function runPredicate<T extends StageObject>(
  state: ExecutionState<T>,
  predicateId: number,
  target: number,
) {
  const predicate = state.plan.tables.predicates[predicateId]
  const kind = (state.plan.tables.predicateKinds[predicateId] ?? 'GENERIC') as CompiledPredicateKind

  if (!predicate) {
    failState(
      state,
      `${ErrorMessage[ErrorCode.ERR_OPCODE_NOT_IMPL]}: predicate ${predicateId}`,
      ErrorCode.ERR_OPCODE_NOT_IMPL,
    )
    return
  }

  let sync = true
  const advance = (value: boolean) => {
    state.suspended = false
    state.pc = value ? target : state.pc + 1

    if (!sync) {
      executeCompiledPlanLoop(state)
    }
  }

  const settle = (result: PredicateResult) => {
    if (state.completed) {
      return
    }

    if (result.err !== undefined) {
      state.inputErr = result.err
    }

    advance(result.value)
  }

  dispatchPredicate(predicate as any, kind, state.ctx, state.inputErr, settle)

  sync = false
}

function pushFrame<T extends StageObject>(
  state: ExecutionState<T>,
  op: Extract<CompiledPlan<T>['ops'][number], { op: 'PUSH_FRAME' }>,
) {
  switch (op.frameKind) {
    case 'SCOPE': {
      state.frameStack.push({ kind: 'SCOPE', inputErr: state.inputErr })
      state.pc += 1
      return
    }

    case 'WRAP': {
      const data = typeof op.data === 'number' ? state.plan.tables.constants[op.data] : undefined

      if (!data) {
        failState(
          state,
          `${ErrorMessage[ErrorCode.ERR_OPCODE_NOT_IMPL]}: PUSH_FRAME/${op.frameKind}`,
          ErrorCode.ERR_OPCODE_NOT_IMPL,
        )
        return
      }

      try {
        const originalCtx = state.ctx
        const prepare = state.plan.tables.transforms[data.prepareId]
        const preparedCtx = prepare ? (prepare(originalCtx) ?? originalCtx) : originalCtx

        state.frameStack.push({
          kind: 'WRAP',
          finalizeId: data.finalizeId,
          originalCtx,
        })
        state.ctx = preparedCtx
        state.pc += 1
      } catch (err) {
        failState(state, err)
      }
      return
    }

    default:
      failState(
        state,
        `${ErrorMessage[ErrorCode.ERR_OPCODE_NOT_IMPL]}: PUSH_FRAME/${op.frameKind}`,
        ErrorCode.ERR_OPCODE_NOT_IMPL,
      )
  }
}

function popFrame<T extends StageObject>(state: ExecutionState<T>) {
  const frame = state.frameStack.pop()

  if (!frame || frame.kind === 'ROOT') {
    failState(
      state,
      `${ErrorMessage[ErrorCode.ERR_OPCODE_NOT_IMPL]}: POP_FRAME`,
      ErrorCode.ERR_OPCODE_NOT_IMPL,
    )
    return
  }

  switch (frame.kind) {
    case 'SCOPE':
      state.inputErr = frame.inputErr
      state.pc += 1
      return
    case 'WRAP': {
      try {
        const finalize = state.plan.tables.transforms[frame.finalizeId]
        state.ctx = finalize ? (finalize(frame.originalCtx, state.ctx) ?? frame.originalCtx) : frame.originalCtx
        state.pc += 1
      } catch (err) {
        failState(state, err)
      }
      return
    }
    default:
      failState(
        state,
        `${ErrorMessage[ErrorCode.ERR_OPCODE_NOT_IMPL]}: POP_FRAME/${frame.kind}`,
        ErrorCode.ERR_OPCODE_NOT_IMPL,
      )
  }
}

function createSequentialIterationError(
  frame: Extract<Frame, { kind: 'SEQUENTIAL' }>,
  err: unknown,
  ctx: unknown,
) {
  return new Error('sequential - error', {
    cause: {
      err,
      iteration: frame.index,
      stage: frame.data.stage,
      ctx,
    },
  })
}

function createParallelIterationError(
  frame: Extract<Frame, { kind: 'PARALLEL' }>,
  index: number,
  err: unknown,
  ctx: unknown,
) {
  return new Error('parallel - error', {
    cause: {
      stage: frame.data.stageName,
      index,
      err,
      ctx,
    },
  })
}

function abortParallelActiveControllers(
  frame: Extract<Frame, { kind: 'PARALLEL' }>,
) {
  for (let i = 0; i < frame.controllers.length; i++) {
    const controller = frame.controllers[i]
    frame.controllerCleanups[i]?.()
    frame.controllerCleanups[i] = null

    if (controller && !controller.signal.aborted) {
      controller.abort(createCodeError(ErrorCode.ERR_STAGE_ABORTED))
    }

    frame.controllers[i] = null
  }
}

function settleParallelFrame<T extends StageObject>(
  state: ExecutionState<T>,
  frame: Extract<Frame, { kind: 'PARALLEL' }>,
  resume: boolean,
  resultChildren?: any[],
) {
  if (frame.settled || state.completed) {
    return
  }

  frame.settled = true
  if (frame.drainTimer) {
    clearTimeout(frame.drainTimer)
    frame.drainTimer = null
  }

  if (resultChildren !== undefined && frame.data.join !== 'all') {
    abortParallelActiveControllers(frame)
  }

  removeFrame(state, frame)

  if (resultChildren === undefined && frame.errors.length > 0) {
    completePrimitiveError(state, createError(frame.errors as any) as any, frame.originalCtx)
  } else {
    try {
      completePrimitiveSuccess(
        state,
        (
          frame.data.combine(
            frame.originalCtx,
            resultChildren ?? frame.children,
          ) ?? frame.originalCtx
        ) as T,
      )
    } catch (err) {
      failPrimitive(state, err, frame.originalCtx)
    }
  }

  if (resume && !state.completed) {
    executeCompiledPlanLoop(state)
  }
}

function getParallelSuccessTarget(
  frame: Extract<Frame, { kind: 'PARALLEL' }>,
) {
  if (frame.data.join === 'any') {
    return 1
  }

  if (frame.data.join === 'quorum') {
    return Math.min(
      Math.max(1, frame.data.quorum ?? frame.children.length),
      frame.children.length,
    )
  }

  return frame.children.length
}

function shouldDrainTrailing(
  frame: Extract<Frame, { kind: 'PARALLEL' }>,
) {
  return frame.data.trailing === 'drain-active' && frame.data.join !== 'all'
}

function maybeStartParallelDrainTimer<T extends StageObject>(
  state: ExecutionState<T>,
  frame: Extract<Frame, { kind: 'PARALLEL' }>,
) {
  if (
    frame.settled ||
    frame.drainTimer ||
    !shouldDrainTrailing(frame) ||
    frame.data.trailingTimeout === undefined
  ) {
    return
  }

  frame.drainTimer = setTimeout(() => {
    frame.drainTimer = null

    if (frame.settled || state.completed || !frame.thresholdMet) {
      return
    }

    settleParallelFrame(
      state,
      frame,
      true,
      frame.data.join === 'all'
        ? frame.children
        : collectParallelSuccessfulChildren(frame),
    )
  }, frame.data.trailingTimeout)
}

function collectParallelSuccessfulChildren(
  frame: Extract<Frame, { kind: 'PARALLEL' }>,
) {
  return frame.successfulChildren.filter((child) => child !== undefined)
}

function getParallelConcurrencyLimit(
  frame: Extract<Frame, { kind: 'PARALLEL' }>,
) {
  return Math.min(
    Math.max(1, frame.data.concurrency ?? frame.children.length),
    frame.children.length,
  )
}

function continueParallelFrame<T extends StageObject>(
  state: ExecutionState<T>,
  frame: Extract<Frame, { kind: 'PARALLEL' }>,
) {
  try {
    const concurrency = getParallelConcurrencyLimit(frame)
    const successTarget = getParallelSuccessTarget(frame)

    while (
      !state.completed &&
      !frame.settled &&
      !(frame.thresholdMet && shouldDrainTrailing(frame)) &&
      frame.active < concurrency &&
      frame.nextIndex < frame.children.length
    ) {
      const index = frame.nextIndex
      const childCtx = frame.children[index]
      const linkedController = createLinkedAbortController(getExecutionSignal(frame.originalCtx))
      const controller = linkedController.controller
      frame.nextIndex += 1
      frame.active += 1
      frame.controllers[index] = controller
      frame.controllerCleanups[index] = linkedController.cleanup

      let sync = true
      let settledSync = false
      let syncErr: Possible<Error>
      let syncCtx: any

      invokeStageFn(state.plan, frame.data.stageFnId!, state.inputErr, childCtx, ((err: Possible<Error>, ctx?: any) => {
        linkedController.cleanup()
        frame.controllerCleanups[index] = null
        frame.controllers[index] = null

        if (state.completed || frame.settled) {
          return
        }

        if (sync) {
          settledSync = true
          syncErr = err
          syncCtx = ctx
          return
        }

        frame.active -= 1
        frame.pending -= 1

        if (err) {
          frame.errors.push(createParallelIterationError(frame, index, err, childCtx))
        } else {
          frame.children[index] = (ctx ?? childCtx) as T
          if (frame.successfulChildren[index] === undefined) {
            frame.successfulChildren[index] = frame.children[index]
            frame.successCount += 1
          }

          if (frame.successCount >= successTarget) {
            frame.thresholdMet = true

            if (!shouldDrainTrailing(frame)) {
              settleParallelFrame(
                state,
                frame,
                true,
                frame.data.join === 'all'
                  ? frame.children
                  : collectParallelSuccessfulChildren(frame),
              )
              return
            }

            maybeStartParallelDrainTimer(state, frame)

            if (frame.active === 0) {
              settleParallelFrame(
                state,
                frame,
                true,
                frame.data.join === 'all'
                  ? frame.children
                  : collectParallelSuccessfulChildren(frame),
              )
            }
            return
          }
        }

        if (frame.thresholdMet && shouldDrainTrailing(frame)) {
          if (frame.active === 0) {
            settleParallelFrame(
              state,
              frame,
              true,
              frame.data.join === 'all'
                ? frame.children
                : collectParallelSuccessfulChildren(frame),
            )
          }
          return
        }

        if (frame.pending === 0) {
          if (frame.successCount >= successTarget) {
            settleParallelFrame(
              state,
              frame,
              true,
              frame.data.join === 'all'
                ? frame.children
                : collectParallelSuccessfulChildren(frame),
            )
          } else {
            settleParallelFrame(state, frame, true)
          }
          return
        }

        continueParallelFrame(state, frame)
        if (!state.suspended && !state.completed) {
          executeCompiledPlanLoop(state)
        }
      }) as CallbackFunction<any>, controller.signal)

      sync = false

      if (!settledSync) {
        continue
      }

      frame.active -= 1
      frame.pending -= 1
      frame.controllers[index] = null

      if (syncErr) {
        frame.errors.push(createParallelIterationError(frame, index, syncErr, childCtx))
      } else {
        frame.children[index] = (syncCtx ?? childCtx) as T
        if (frame.successfulChildren[index] === undefined) {
          frame.successfulChildren[index] = frame.children[index]
          frame.successCount += 1
        }

        if (frame.successCount >= successTarget) {
          frame.thresholdMet = true

          if (!shouldDrainTrailing(frame)) {
            settleParallelFrame(
              state,
              frame,
              false,
              frame.data.join === 'all'
                ? frame.children
                : collectParallelSuccessfulChildren(frame),
            )
            return
          }

          maybeStartParallelDrainTimer(state, frame)

          if (frame.active === 0) {
            settleParallelFrame(
              state,
              frame,
              false,
              frame.data.join === 'all'
                ? frame.children
                : collectParallelSuccessfulChildren(frame),
            )
          }
          return
        }
      }

      if (frame.thresholdMet && shouldDrainTrailing(frame)) {
        if (frame.active === 0) {
          settleParallelFrame(
            state,
            frame,
            false,
            frame.data.join === 'all'
              ? frame.children
              : collectParallelSuccessfulChildren(frame),
          )
        }
        return
      }

      if (frame.pending === 0) {
        if (frame.successCount >= successTarget) {
          settleParallelFrame(
            state,
            frame,
            false,
            frame.data.join === 'all'
              ? frame.children
              : collectParallelSuccessfulChildren(frame),
          )
        } else {
          settleParallelFrame(state, frame, false)
        }
        return
      }
    }
  } catch (err) {
    removeFrame(state, frame)
    failPrimitive(state, err, frame.originalCtx)
  }
}

function runParallelOp<T extends StageObject>(
  state: ExecutionState<T>,
  dataIndex: number,
) {
  const data = state.plan.tables.constants[dataIndex] as ParallelPlanData | undefined

  if (!data || data.kind !== 'PARALLEL') {
    failState(
      state,
      `${ErrorMessage[ErrorCode.ERR_OPCODE_NOT_IMPL]}: RUN_PARALLEL`,
      ErrorCode.ERR_OPCODE_NOT_IMPL,
    )
    return
  }

  if (data.stageFnId === undefined) {
    if (state.inputErr) {
      completePrimitiveError(state, state.inputErr, state.ctx)
    } else {
      completePrimitiveSuccess(state, state.ctx)
    }
    return
  }

  let children: any[] | null | undefined

  try {
    children = data.split(state.ctx)
  } catch (err) {
    failPrimitive(state, err, state.ctx)
    return
  }

  if (!Array.isArray(children) || children.length === 0) {
    if (state.inputErr) {
      completePrimitiveError(state, state.inputErr, state.ctx)
    } else {
      completePrimitiveSuccess(state, state.ctx)
    }
    return
  }

  const frame: Extract<Frame, { kind: 'PARALLEL' }> = {
    kind: 'PARALLEL',
    data,
    originalCtx: state.ctx,
    children,
    controllers: new Array(children.length).fill(null),
    controllerCleanups: new Array(children.length).fill(null),
    successfulChildren: new Array(children.length),
    successCount: 0,
    thresholdMet: false,
    drainTimer: null,
    nextIndex: 0,
    active: 0,
    pending: children.length,
    errors: [],
    settled: false,
  }

  state.frameStack.push(frame)
  continueParallelFrame(state, frame)
}

function runMultiWaySwitchOp<T extends StageObject>(
  state: ExecutionState<T>,
  dataIndex: number,
) {
  const data = state.plan.tables.constants[dataIndex] as MultiWaySwitchPlanData | undefined

  if (!data || data.kind !== 'MWS') {
    failState(
      state,
      `${ErrorMessage[ErrorCode.ERR_OPCODE_NOT_IMPL]}: RUN_MWS`,
      ErrorCode.ERR_OPCODE_NOT_IMPL,
    )
    return
  }

  const toExecutableStaticCase = (caseItem: {
    stage: unknown
    stageFnId: number
    split?: (ctx: any) => any
    combine?: (ctx: any, retCtx: any) => any
  }) => ({
    stage: caseItem.stage,
    split: caseItem.split,
    combine: caseItem.combine,
    run: ((err: Possible<CleanError>, ctx: any, done: CallbackFunction<any>) => {
      invokeStageFn(state.plan, caseItem.stageFnId, err as any, ctx, done)
    }) as RunPipelineFunction<any>,
  })

  const toExecutableDynamicCase = (caseItem: {
    stage: unknown
    stageFnId: number
    evaluate: (ctx: any) => any
    split?: (ctx: any) => any
    combine?: (ctx: any, retCtx: any) => any
  }) => ({
    ...toExecutableStaticCase(caseItem),
    evaluate: caseItem.evaluate,
  })

  let sync = true

  executeNativeMultiWaySwitch(
    state.inputErr,
    state.ctx,
    {
      statics: data.statics.map(toExecutableStaticCase),
      dynamics: data.dynamics.map(toExecutableDynamicCase),
    },
    ((err, ctx) => {
      completeOp(state, err, ctx, sync)
    }) as CallbackFunction<T>,
  )

  sync = false
}

function continueSequentialFrame<T extends StageObject>(
  state: ExecutionState<T>,
  frame: Extract<Frame, { kind: 'SEQUENTIAL' }>,
) {
  try {
    while (!state.completed && frame.index < frame.children.length) {
      const index = frame.index
      const childCtx = frame.children[index]
      if (frame.data.inlineControlPlan) {
        let sync = true
        let settledSync = false
        let syncErr: any
        let syncResult: any

        executeInlineControlFlowSubplan(
          frame.data.inlineControlPlan,
          undefined,
          childCtx,
          ((err, ctx) => {
            if (state.completed) {
              return
            }

            if (sync) {
              settledSync = true
              syncErr = err
              syncResult = ctx
              return
            }

            if (err) {
              removeFrame(state, frame)
              completePrimitiveError(state, createSequentialIterationError(frame, err, childCtx) as any, frame.originalCtx)
              executeCompiledPlanLoop(state)
              return
            }

            frame.results[index] = (ctx ?? childCtx) as T
            frame.index = index + 1
            continueSequentialFrame(state, frame)
            if (!state.suspended && !state.completed) {
              executeCompiledPlanLoop(state)
            }
          }) as CallbackFunction<any>,
        )

        sync = false

        if (!settledSync) {
          return
        }

        if (syncErr) {
          removeFrame(state, frame)
          completePrimitiveError(state, createSequentialIterationError(frame, syncErr, childCtx) as any, frame.originalCtx)
          return
        }

        frame.results[index] = syncResult ?? childCtx
        frame.index = index + 1
        continue
      }

      if (frame.data.subplanId !== undefined) {
        const subplan = state.plan.tables.subplans[frame.data.subplanId]

        if (!subplan) {
          removeFrame(state, frame)
          failPrimitive(
            state,
            `${ErrorMessage[ErrorCode.ERR_OPCODE_NOT_IMPL]}: RUN_SEQUENTIAL subplan ${frame.data.subplanId}`,
            frame.originalCtx,
            ErrorCode.ERR_OPCODE_NOT_IMPL,
          )
          return
        }

        invokeSubplan(
          state,
          subplan,
          undefined,
          childCtx,
          state.frameStack.length - 1,
          index,
          childCtx,
        )
        return
      }

      let sync = true
      let settledSync = false
      let syncErr: any
      let syncResult: any

      const settle = ((err, ctx) => {
        if (state.completed) {
          return
        }

        if (sync) {
          settledSync = true
          syncErr = err
          syncResult = ctx
          return
        }

        if (err) {
          removeFrame(state, frame)
          completePrimitiveError(state, createSequentialIterationError(frame, err, childCtx) as any, frame.originalCtx)
          executeCompiledPlanLoop(state)
          return
        }

        frame.results[index] = (ctx ?? childCtx) as T
        frame.index = index + 1
        continueSequentialFrame(state, frame)
        if (!state.suspended && !state.completed) {
          executeCompiledPlanLoop(state)
        }
      }) as CallbackFunction<any>

      if (frame.data.fusedPlan && frame.data.fusedStageFnIds) {
        executeFusedStageFnSequence(
          frame.data.fusedPlan,
          frame.data.fusedStageFnIds,
          undefined,
          childCtx,
          settle,
        )
      } else if (frame.data.stageFnId !== undefined) {
        invokeStageFn(state.plan, frame.data.stageFnId, undefined, childCtx, settle)
      } else {
        settledSync = true
        syncResult = childCtx
      }

      sync = false

      if (!settledSync) {
        return
      }

      if (syncErr) {
        removeFrame(state, frame)
        completePrimitiveError(state, createSequentialIterationError(frame, syncErr, childCtx) as any, frame.originalCtx)
        return
      }

      frame.results[index] = syncResult ?? childCtx
      frame.index = index + 1
    }

    removeFrame(state, frame)
    completePrimitiveSuccess(state, (frame.data.combine(frame.originalCtx, frame.results) ?? frame.originalCtx) as T)
  } catch (err) {
    removeFrame(state, frame)
    failPrimitive(state, err, frame.originalCtx)
  }
}

function runSequentialOp<T extends StageObject>(
  state: ExecutionState<T>,
  dataIndex: number,
) {
  const data = state.plan.tables.constants[dataIndex] as SequentialPlanData | undefined

  if (!data || data.kind !== 'SEQUENTIAL') {
    failState(
      state,
      `${ErrorMessage[ErrorCode.ERR_OPCODE_NOT_IMPL]}: RUN_SEQUENTIAL`,
      ErrorCode.ERR_OPCODE_NOT_IMPL,
    )
    return
  }

  if (state.inputErr) {
    completePrimitiveError(state, state.inputErr, state.ctx)
    return
  }

  try {
    const children = data.split(state.ctx)

    if (!children.length) {
      completePrimitiveSuccess(state, state.ctx)
      return
    }

    const frame: Extract<Frame, { kind: 'SEQUENTIAL' }> = {
      kind: 'SEQUENTIAL',
      data,
      originalCtx: state.ctx,
      children,
      results: new Array(children.length),
      index: 0,
    }

    state.frameStack.push(frame)
    continueSequentialFrame(state, frame)
  } catch (err) {
    failPrimitive(state, err, state.ctx)
  }
}

function continueLoopFrame<T extends StageObject>(
  state: ExecutionState<T>,
  frame: Extract<Frame, { kind: 'LOOP' }>,
) {
  try {
    while (!state.completed) {
      frame.iteration += 1

      if (frame.data.reachEnd(frame.currentErr, frame.currentCtx, frame.iteration)) {
        removeFrame(state, frame)

        if (frame.currentErr) {
          completePrimitiveError(state, frame.currentErr, frame.currentCtx)
        } else {
          completePrimitiveSuccess(state, frame.currentCtx)
        }
        return
      }

      const splitCtx = frame.data.split(frame.currentCtx, frame.iteration)
      let sync = true
      let settledSync = false
      let syncErr: any
      let syncResult: any

      invokeStageFn(state.plan, frame.data.stageFnId, frame.currentErr, splitCtx, ((err, ctx) => {
        if (state.completed) {
          return
        }

        if (sync) {
          settledSync = true
          syncErr = err
          syncResult = ctx
          return
        }

        frame.currentErr = err
        if (!err) {
          frame.currentCtx = (ctx ?? splitCtx ?? frame.currentCtx) as T
        }
        continueLoopFrame(state, frame)
        if (!state.suspended && !state.completed) {
          executeCompiledPlanLoop(state)
        }
      }) as CallbackFunction<any>)

      sync = false

      if (!settledSync) {
        return
      }

      frame.currentErr = syncErr
      if (!syncErr) {
        frame.currentCtx = (syncResult ?? splitCtx ?? frame.currentCtx) as T
      }
    }
  } catch (err) {
    removeFrame(state, frame)
    failPrimitive(state, err, frame.currentCtx)
  }
}

function runLoopOp<T extends StageObject>(
  state: ExecutionState<T>,
  dataIndex: number,
) {
  const data = state.plan.tables.constants[dataIndex] as LoopPlanData | undefined

  if (!data || data.kind !== 'LOOP') {
    failState(
      state,
      `${ErrorMessage[ErrorCode.ERR_OPCODE_NOT_IMPL]}: RUN_LOOP`,
      ErrorCode.ERR_OPCODE_NOT_IMPL,
    )
    return
  }

  const frame: Extract<Frame, { kind: 'LOOP' }> = {
    kind: 'LOOP',
    data,
    currentCtx: state.ctx,
    currentErr: state.inputErr,
    iteration: -1,
  }

  state.frameStack.push(frame)
  continueLoopFrame(state, frame)
}

function shouldRetry(frame: Extract<Frame, { kind: 'RETRY_STATE' }>) {
  if (!frame.currentErr) {
    return false
  }

  if (typeof frame.data.retry === 'function') {
    return frame.data.retry(frame.currentErr, frame.currentCtx, frame.iteration)
  }

  return frame.iteration <= frame.data.retry
}

function continueRetryFrame<T extends StageObject>(
  state: ExecutionState<T>,
  frame: Extract<Frame, { kind: 'RETRY_STATE' }>,
) {
  try {
    while (!state.completed) {
      frame.iteration += 1

      if (frame.iteration > 0) {
        frame.currentCtx = frame.data.restore(frame.currentCtx, frame.backup)
      }

      let sync = true
      let settledSync = false
      let syncErr: any
      let syncResult: any

      invokeStageFn(state.plan, frame.data.stageFnId, frame.currentErr, frame.currentCtx, ((err, ctx) => {
        if (state.completed) {
          return
        }

        if (sync) {
          settledSync = true
          syncErr = err
          syncResult = ctx
          return
        }

        frame.currentErr = err
        if (!err) {
          frame.currentCtx = (ctx ?? frame.currentCtx) as T
        }

        if (shouldRetry(frame)) {
          continueRetryFrame(state, frame)
          if (!state.suspended && !state.completed) {
            executeCompiledPlanLoop(state)
          }
          return
        }

        removeFrame(state, frame)
        if (frame.currentErr) {
          completePrimitiveError(state, frame.currentErr, frame.currentCtx)
        } else {
          completePrimitiveSuccess(state, frame.currentCtx)
        }
        executeCompiledPlanLoop(state)
      }) as CallbackFunction<any>)

      sync = false

      if (!settledSync) {
        return
      }

      frame.currentErr = syncErr
      if (!syncErr) {
        frame.currentCtx = (syncResult ?? frame.currentCtx) as T
      }

      if (!shouldRetry(frame)) {
        removeFrame(state, frame)
        if (frame.currentErr) {
          completePrimitiveError(state, frame.currentErr, frame.currentCtx)
        } else {
          completePrimitiveSuccess(state, frame.currentCtx)
        }
        return
      }
    }
  } catch (err) {
    removeFrame(state, frame)
    failPrimitive(state, err, frame.initialCtx)
  }
}

function runRetryOp<T extends StageObject>(
  state: ExecutionState<T>,
  dataIndex: number,
) {
  const data = state.plan.tables.constants[dataIndex] as RetryPlanData | undefined

  if (!data || data.kind !== 'RETRY') {
    failState(
      state,
      `${ErrorMessage[ErrorCode.ERR_OPCODE_NOT_IMPL]}: RUN_RETRY`,
      ErrorCode.ERR_OPCODE_NOT_IMPL,
    )
    return
  }

  try {
    const frame: Extract<Frame, { kind: 'RETRY_STATE' }> = {
      kind: 'RETRY_STATE',
      data,
      initialCtx: state.ctx,
      currentCtx: state.ctx,
      currentErr: state.inputErr,
      backup: data.backup(state.ctx),
      iteration: -1,
    }

    state.frameStack.push(frame)
    continueRetryFrame(state, frame)
  } catch (err) {
    failPrimitive(state, err, state.ctx)
  }
}

function runTimeoutOp<T extends StageObject>(
  state: ExecutionState<T>,
  dataIndex: number,
) {
  const data = state.plan.tables.constants[dataIndex] as TimeoutPlanData | undefined

  if (!data || data.kind !== 'TIMEOUT') {
    failState(
      state,
      `${ErrorMessage[ErrorCode.ERR_OPCODE_NOT_IMPL]}: RUN_TIMEOUT`,
      ErrorCode.ERR_OPCODE_NOT_IMPL,
    )
    return
  }

  let waitFor: number | undefined

  try {
    waitFor = typeof data.timeout === 'function' ? data.timeout(state.ctx) : data.timeout
  } catch (err) {
    failPrimitive(state, err, state.ctx)
    return
  }

  if (!waitFor) {
    if (data.stageFnId === undefined) {
      completePrimitiveSuccess(state, state.ctx)
      return
    }

    let sync = true
    let settledSync = false
    let syncErr: any
    let syncResult: any

    invokeStageFn(state.plan, data.stageFnId, state.inputErr, state.ctx, ((err, ctx) => {
      if (sync) {
        settledSync = true
        syncErr = err
        syncResult = ctx
        return
      }

      if (err) {
        completePrimitiveError(state, err, state.ctx)
      } else {
        completePrimitiveSuccess(state, (ctx ?? state.ctx) as T)
      }
      executeCompiledPlanLoop(state)
    }) as CallbackFunction<T>)

    sync = false

    if (!settledSync) {
      return
    }

    if (syncErr) {
      completePrimitiveError(state, syncErr, state.ctx)
    } else {
      completePrimitiveSuccess(state, (syncResult ?? state.ctx) as T)
    }
    return
  }

  const frame: Extract<Frame, { kind: 'TIMEOUT' }> = {
    kind: 'TIMEOUT',
    data,
    originalCtx: state.ctx,
    settled: false,
    timer: null,
    controller: null,
    controllerCleanup: null,
  }

  if (data.stageFnId !== undefined) {
    const linkedController = createLinkedAbortController(getExecutionSignal(state.ctx))
    frame.controller = linkedController.controller
    frame.controllerCleanup = linkedController.cleanup
  }

  state.frameStack.push(frame)

  const finalize = (sync: boolean, err?: any, ctx?: T) => {
    if (frame.settled || state.completed) {
      return
    }

    frame.settled = true
    if (frame.timer) {
      clearTimeout(frame.timer)
      frame.timer = null
    }
    frame.controllerCleanup?.()
    frame.controllerCleanup = null

    removeFrame(state, frame)
    if (err) {
      completePrimitiveError(state, err, frame.originalCtx)
    } else {
      completePrimitiveSuccess(state, (ctx ?? frame.originalCtx) as T)
    }

    if (!sync) {
      executeCompiledPlanLoop(state)
    }
  }

  frame.timer = setTimeout(() => {
    frame.timer = null
    if (frame.settled || state.completed) {
      return
    }

    if (frame.controller && !frame.controller.signal.aborted) {
      frame.controller.abort(createCodeError(ErrorCode.ERR_STAGE_TIMEOUT))
    }

    if (data.overdueStageFnId === undefined) {
      finalize(false, undefined, frame.originalCtx)
      return
    }

    let sync = true
    let settledSync = false
    let syncErr: any
    let syncResult: any

    invokeStageFn(state.plan, data.overdueStageFnId, state.inputErr, frame.originalCtx, ((err, ctx) => {
      if (frame.settled || state.completed) {
        return
      }

      if (sync) {
        settledSync = true
        syncErr = err
        syncResult = ctx
        return
      }

      finalize(false, err, (ctx ?? frame.originalCtx) as T)
    }) as CallbackFunction<T>)

    sync = false

    if (settledSync) {
      finalize(false, syncErr, (syncResult ?? frame.originalCtx) as T)
    }
  }, waitFor)

  if (data.stageFnId === undefined) {
    return
  }

  const isolatedCtx = createIsolatedStageContext(frame.originalCtx)
  let sync = true
  let settledSync = false
  let syncErr: any
  let syncResult: any

  invokeStageFn(state.plan, data.stageFnId, state.inputErr, isolatedCtx, ((err, ctx) => {
    if (frame.settled || state.completed) {
      return
    }

    if (sync) {
      settledSync = true
      syncErr = err
      syncResult = ctx
      return
    }

    if (err) {
      finalize(false, err, frame.originalCtx)
      return
    }

    const committed = commitIsolatedStageContext(frame.originalCtx, (ctx ?? isolatedCtx) as T)
    finalize(false, undefined, committed)
  }) as CallbackFunction<T>, frame.controller?.signal)

  sync = false

  if (!settledSync) {
    return
  }

  if (syncErr) {
    finalize(true, syncErr, frame.originalCtx)
  } else {
    const committed = commitIsolatedStageContext(frame.originalCtx, (syncResult ?? isolatedCtx) as T)
    finalize(true, undefined, committed)
  }
}

function executeCompiledPlanLoop<T extends StageObject>(state: ExecutionState<T>) {
  while (!state.suspended && !state.completed) {
    const op = state.plan.ops[state.pc]

    if (!op) {
      failState(state, ErrorMessage[ErrorCode.ERR_PC_OUT_OF_BOUNDS], ErrorCode.ERR_PC_OUT_OF_BOUNDS)
      continue
    }

    switch (op.op) {
      case 'RUN_STAGE_FN':
        state.suspended = true
        runCompiledStageFn(state, op.stageFnId)
        if (state.suspended) return
        continue

      case 'RUN_STAGE_INSTANCE':
        state.suspended = true
        runWithStage(state, state.plan.tables.stageInstances[op.stageId])
        if (state.suspended) return
        continue

      case 'RUN_FALLBACK_STAGE':
        state.suspended = true
        runWithStage(state, state.plan.tables.stageInstances[op.stageId])
        if (state.suspended) return
        continue

      case 'RUN_SEQUENTIAL':
        state.suspended = true
        runSequentialOp(state, op.data)
        if (state.suspended) return
        continue

      case 'RUN_LOOP':
        state.suspended = true
        runLoopOp(state, op.data)
        if (state.suspended) return
        continue

      case 'RUN_RETRY':
        state.suspended = true
        runRetryOp(state, op.data)
        if (state.suspended) return
        continue

      case 'RUN_TIMEOUT':
        state.suspended = true
        runTimeoutOp(state, op.data)
        if (state.suspended) return
        continue

      case 'RUN_PARALLEL':
        state.suspended = true
        runParallelOp(state, op.data)
        if (state.suspended) return
        continue

      case 'RUN_MWS':
        state.suspended = true
        runMultiWaySwitchOp(state, op.data)
        if (state.suspended) return
        continue

      case 'SET_CTX_FROM_RESULT':
        if (!state.err && state.result !== undefined) {
          state.ctx = state.result
        }
        state.result = undefined
        state.pc += 1
        continue

      case 'JUMP':
        state.pc = op.target
        continue

      case 'JUMP_IF_TRUE':
        state.suspended = true
        runPredicate(state, op.predicateId, op.target)
        if (state.suspended) return
        continue

      case 'PUSH_FRAME':
        pushFrame(state, op as any)
        continue

      case 'POP_FRAME':
        popFrame(state)
        continue

      case 'RETURN':
        if (returnFromSubplan(state)) {
          continue
        }
        completeState(state)
        return
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
