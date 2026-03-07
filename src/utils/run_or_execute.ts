import { CleanError, createError, normalizeExecutionErrorInput } from './ErrorList'
import { bindExecutionSignal, getExecutionSignal } from '../execution_signal'
import { execute_callback } from './execute_callback'
import { isError } from './TypeDetectors'
import { isAnyStage } from './types'
import {
  AnyStage,
  CallbackFunction,
  Possible,
  RunPipelineFunction,
  StageObject,
} from './types'

export function run_or_execute<T extends StageObject>(
  stage: AnyStage<T> | RunPipelineFunction<T>,
  err: Possible<CleanError>,
  context: T,
  _done: CallbackFunction<T>,
  signal?: AbortSignal,
): void {
  // OPT-9: skip wrapper closure when stage is a Stage instance — execute() always
  // resolves with a valid ctx. For function stages, keep the ctx??context fallback
  // since arity-0 functions may omit the return value.
  const effectiveSignal = signal ?? getExecutionSignal(context)
  const cleanup = bindExecutionSignal(context, effectiveSignal)
  const done = ((err: Possible<CleanError>, ctx: T) => {
    cleanup()
    _done(err, ctx ?? context)
  }) as CallbackFunction<T>

  if (isAnyStage<T>(stage)) {
    runStageSafely(stage, err, context, done)
  } else {
    execute_callback<T>(err, stage, context, done)
  }
}

const STAGE_DISPATCH_STACK_LIMIT = 128
let stageDispatchDepth = 0

const deferStageDispatch =
  typeof queueMicrotask === 'function'
    ? queueMicrotask
    : (cb: () => void) => {
        Promise.resolve().then(cb)
      }

function runStageSafely<T extends StageObject>(
  stage: AnyStage<T>,
  err: Possible<CleanError>,
  context: T,
  done: CallbackFunction<T>,
) {
  const invoke = () => {
    stageDispatchDepth++
    try {
      stage.execute(normalizeExecutionErrorInput(err), context, done)
    } catch (error) {
      done(createError(isError(error) ? error : String(error)), context)
    } finally {
      stageDispatchDepth--
    }
  }

  // Deeply nested Stage→Stage dispatch grows the synchronous JS call stack even
  // though execution is semantically sequential. Break the chain occasionally so
  // nested Pipeline/Wrap/IfElse graphs stay stack-safe without penalizing flat
  // pipelines (their depth never approaches this limit).
  if (stageDispatchDepth >= STAGE_DISPATCH_STACK_LIMIT) {
    deferStageDispatch(invoke)
  } else {
    invoke()
  }
}
