// =============================================================================
// Error Code Taxonomy (TASK-010)
// =============================================================================
// Stable, public-safe error codes for diagnosis without leaking platform internals.
// Format: ERR_<CATEGORY> — short, greppable, never changes once published.
// Human-readable messages are paired but NOT the stable contract — codes are.

/** Stable error code constants used throughout pipeline.js */
export const ErrorCode = {
  /** Function signature does not match any supported run/rescue/validate/ensure arity */
  ERR_SIGNATURE: 'ERR_SIGNATURE',
  /** Context failed validation (validate returned false or non-boolean) */
  ERR_INVALID_CONTEXT: 'ERR_INVALID_CONTEXT',
  /** Stage has no run function configured */
  ERR_NO_RUN: 'ERR_NO_RUN',
  /** Stage execution exceeded configured timeout */
  ERR_STAGE_TIMEOUT: 'ERR_STAGE_TIMEOUT',
  /** Callback was invoked more than once (double-done protection) */
  ERR_CALLBACK_DOUBLE: 'ERR_CALLBACK_DOUBLE',
  /** Context is not a Context object where one was expected */
  ERR_CONTEXT_TYPE: 'ERR_CONTEXT_TYPE',
  /** Catch-all for errors that cannot be categorized */
  ERR_UNKNOWN: 'ERR_UNKNOWN',
  /** Compiled executor program counter went out of bounds */
  ERR_PC_OUT_OF_BOUNDS: 'ERR_PC_OUT_OF_BOUNDS',
  /** Compiled executor encountered an opcode not implemented in current phase */
  ERR_OPCODE_NOT_IMPL: 'ERR_OPCODE_NOT_IMPL',
  /** User code threw an error during stage execution */
  ERR_STAGE_THROW: 'ERR_STAGE_THROW',
} as const

export type ErrorCodeType = typeof ErrorCode[keyof typeof ErrorCode]

/** Human-readable messages paired with error codes (not a stable contract) */
export const ErrorMessage: Record<ErrorCodeType, string> = {
  [ErrorCode.ERR_SIGNATURE]: 'unacceptable run method signature',
  [ErrorCode.ERR_INVALID_CONTEXT]: 'context is invalid',
  [ErrorCode.ERR_NO_RUN]: 'run is not a function',
  [ErrorCode.ERR_STAGE_TIMEOUT]: 'stage timeout occurred',
  [ErrorCode.ERR_CALLBACK_DOUBLE]: 'callback called more than once',
  [ErrorCode.ERR_CONTEXT_TYPE]: 'context is not a Context object',
  [ErrorCode.ERR_UNKNOWN]: 'unknown error occurred',
  [ErrorCode.ERR_PC_OUT_OF_BOUNDS]: 'compiled executor pc out of bounds',
  [ErrorCode.ERR_OPCODE_NOT_IMPL]: 'opcode not implemented in current executor phase',
  [ErrorCode.ERR_STAGE_THROW]: 'stage threw an error',
}

// Legacy compatibility — keep the old ERROR object shape alive so existing
// imports don't break, but values now come from the canonical constants.
export const ERROR = {
  signature: ErrorMessage[ErrorCode.ERR_SIGNATURE],
  invalid_context: ErrorMessage[ErrorCode.ERR_INVALID_CONTEXT],
}
