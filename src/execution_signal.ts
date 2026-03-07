import { createCodeError } from './utils/ErrorList'
import { ErrorCode } from './utils/errors'
import { StageObject } from './utils/types'

const ExecutionSignalSymbol = Symbol.for('pipeline.js.execution-signal')

function getSignalCarrier<T extends StageObject>(ctx?: T) {
  if (!ctx || (typeof ctx !== 'object' && typeof ctx !== 'function')) {
    return undefined
  }

  const original = (ctx as any).original

  if (original && typeof original === 'object') {
    return original
  }

  return ctx as object
}

export function bindExecutionSignal<T extends StageObject>(
  ctx: T,
  signal?: AbortSignal,
) {
  const carrier = getSignalCarrier(ctx)

  if (!carrier || !signal) {
    return () => {}
  }

  const previous = Object.getOwnPropertyDescriptor(carrier, ExecutionSignalSymbol)

  Object.defineProperty(carrier, ExecutionSignalSymbol, {
    value: signal,
    configurable: true,
    enumerable: false,
    writable: true,
  })

  return () => {
    if (previous) {
      Object.defineProperty(carrier, ExecutionSignalSymbol, previous)
    } else {
      delete (carrier as any)[ExecutionSignalSymbol]
    }
  }
}

export function getExecutionSignal<T extends StageObject>(
  ctx?: T,
): AbortSignal | undefined {
  return getSignalCarrier(ctx)?.[ExecutionSignalSymbol]
}

export function getExecutionAbortError(reason?: unknown) {
  if (
    reason instanceof Error
    && (
      (reason as any).code === ErrorCode.ERR_STAGE_ABORTED
      || (reason as any).code === ErrorCode.ERR_STAGE_TIMEOUT
    )
  ) {
    return reason
  }

  return createCodeError(ErrorCode.ERR_STAGE_ABORTED)
}

export function getPublicExecutionAbortError(reason?: unknown) {
  if (
    reason instanceof Error
    && (reason as any).code === ErrorCode.ERR_STAGE_ABORTED
  ) {
    return reason
  }

  return createCodeError(ErrorCode.ERR_STAGE_ABORTED)
}

export function createLinkedAbortController(signal?: AbortSignal) {
  const controller = new AbortController()

  if (!signal) {
    return {
      controller,
      cleanup: () => {},
    }
  }

  if (signal.aborted) {
    controller.abort(getExecutionAbortError(signal.reason))
    return {
      controller,
      cleanup: () => {},
    }
  }

  const onAbort = () => {
    controller.abort(getExecutionAbortError(signal.reason))
  }

  signal.addEventListener('abort', onAbort, { once: true })

  const cleanup = () => {
    signal.removeEventListener('abort', onAbort)
  }

  controller.signal.addEventListener('abort', cleanup, { once: true })

  return {
    controller,
    cleanup,
  }
}

export function isExecutionAborted<T extends StageObject>(ctx?: T) {
  return getExecutionSignal(ctx)?.aborted ?? false
}

export function throwIfExecutionAborted<T extends StageObject>(ctx?: T) {
  const signal = getExecutionSignal(ctx)

  if (!signal?.aborted) {
    return
  }

  throw getExecutionAbortError(signal.reason)
}
