export type ContextExecutionMode = 'legacy' | 'warn' | 'explicit'

let contextExecutionModeOverride: ContextExecutionMode | undefined

export function setContextExecutionMode(mode: ContextExecutionMode) {
  contextExecutionModeOverride = mode
}

export function getContextExecutionMode(): ContextExecutionMode {
  if (contextExecutionModeOverride) {
    return contextExecutionModeOverride
  }

  if (typeof process !== 'undefined') {
    const value = process.env.PIPELINE_CONTEXT_MODE
    if (value === 'legacy' || value === 'warn' || value === 'explicit') {
      return value
    }
  }

  return 'explicit'
}

export function __resetContextExecutionModeForTests() {
  contextExecutionModeOverride = undefined
}
