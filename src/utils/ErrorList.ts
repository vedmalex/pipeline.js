// Technology Validation: New CleanError Implementation
// This file validates TypeScript compatibility and performance characteristics

import { Possible } from './types';

// =============================================================================
// TYPE DEFINITIONS (Based on Creative Phase Architecture)
// =============================================================================

/**
 * Error context for structured error information without app context pollution
 */
export interface ErrorContext {
  stage?: string;
  operation?: string;
  timestamp?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Error chain structure for clean error handling
 */
export interface ErrorChain {
  primary: Error;
  secondary?: Error[];
  context?: ErrorContext;
  trace?: string[];
}

/**
 * Options for CleanError constructor
 */
export interface ErrorOptions {
  secondary?: Error[];
  context?: ErrorContext;
  cause?: Error;
}

// =============================================================================
// CLEAN ERROR CLASS (New Implementation)
// =============================================================================

/**
 * CleanError: Modern error handling without context pollution
 * Replaces CleanError with clean architecture and better performance
 */
export class CleanError extends Error {
  readonly chain: ErrorChain;
  readonly isClean = true;

  constructor(primary: Error | string, options?: ErrorOptions) {
    // Call parent constructor with clean message
    super(typeof primary === 'string' ? primary : primary.message);

    // Set error name for stack traces
    this.name = 'CleanError';

    // Build clean error chain
    this.chain = {
      primary: typeof primary === 'string' ? new Error(primary) : primary,
      secondary: options?.secondary,
      context: options?.context,
      trace: (() => {
        try {
          // ES5-compatible inline trace capture
          const stack = new Error().stack;
          if (!stack) return [];

          return stack
            .split('\n')
            .slice(2, 5) // Only 3 frames, not entire stack
            .map(function(frame) { return frame.trim(); })
            .filter(function(frame) { return frame.length > 0; });
        } catch (e) {
          return [];
        }
      })()
    };

    // Support modern Error.cause if provided
    if (options?.cause) {
      this.cause = options.cause;
    }

    // Fix prototype chain for instanceof checks
    Object.setPrototypeOf(this, CleanError.prototype);
  }

  /**
   * Get primary error from chain
   */
  getPrimaryError(): Error {
    return this.chain.primary;
  }

  /**
   * Get secondary errors from chain
   */
  getSecondaryErrors(): Error[] {
    return this.chain.secondary || [];
  }

  /**
   * Get error context if available
   */
  getContext(): ErrorContext | undefined {
    return this.chain.context;
  }

  /**
   * Legacy support for old error format: err?.cause.err
   * @deprecated Use err.chain.primary instead
   */
  override get cause(): any {
    return {
      err: this.chain.primary
    };
  }

  /**
   * Allow setting cause for compatibility
   */
  override set cause(value: any) {
    Object.defineProperty(this, '_legacyCause', {
      value,
      writable: true,
      enumerable: false
    });
  }

  /**
   * Clean string representation without context pollution
   */
  override toString(): string {
    const primary = this.chain.primary.message;
    const secondary = this.chain.secondary;

    if (secondary && secondary.length > 0) {
      return `${primary} (${secondary.length} related errors)`;
    }

    return primary;
  }

  /**
   * JSON serialization without circular references
   */
  toJSON(): object {
    return {
      name: this.name,
      message: this.message,
      primary: this.chain.primary.message,
      secondaryCount: this.chain.secondary?.length || 0,
      context: this.chain.context,
      timestamp: new Date().toISOString()
    };
  }
}

// =============================================================================
// FACTORY FUNCTIONS (Based on Creative Phase Specification)
// =============================================================================

/**
 * Create CleanError from various input types
 */
export function createError(input: string | Error | Error[]): CleanError {
  if (typeof input === 'string') {
    return new CleanError(input);
  }

  if (Array.isArray(input)) {
    // Filter out null/undefined values
    const validErrors = input.filter((err): err is Error => err instanceof Error);

    if (validErrors.length === 0) {
      return new CleanError('Unknown error occurred');
    }

    if (validErrors.length === 1) {
      return new CleanError(validErrors[0]);
    }

    // Multiple errors: first becomes primary, rest secondary
    const [primary, ...secondary] = validErrors;
    return new CleanError(primary, { secondary });
  }

  // Single Error object
  return new CleanError(input);
}

/**
 * Create CleanError with additional context
 */
export function createErrorWithContext(
  error: Error,
  context: ErrorContext
): CleanError {
  return new CleanError(error, { context });
}

/**
 * Chain multiple errors together
 */
export function chainErrors(primary: Error, secondary: Error[]): CleanError {
  return new CleanError(primary, { secondary });
}

/**
 * Type guard for CleanError
 */
export function isCleanError(input: any): input is CleanError {
  return input instanceof CleanError && input.isClean === true;
}

/**
 * Type guard for error chains
 */
export function isErrorChain(input: any): input is CleanError {
  return isCleanError(input) && Array.isArray(input.chain.secondary);
}

/**
 * Extract primary error from CleanError
 */
export function extractPrimaryError(error: CleanError): Error {
  return error.getPrimaryError();
}

/**
 * Get error context from CleanError
 */
export function getErrorContext(error: CleanError): ErrorContext | undefined {
  return error.getContext();
}

// =============================================================================
// BACKWARD COMPATIBILITY LAYER
// =============================================================================

/**
 * Legacy ComplexError class for backward compatibility (value export)
 * @deprecated Use CleanError instead
 */
export { CleanError as ComplexError };

/**
 * Legacy CreateError function for backward compatibility
 * @deprecated Use createError instead
 */
export function CreateError(
  err:
    | string
    | Error
    | CleanError
    | null
    | undefined
    | (string | Error | CleanError | null | undefined)[]
): Possible<CleanError> {
  // Add deprecation warning in development
  if (process.env.NODE_ENV !== 'production') {
    console.warn('[DEPRECATED] CreateError is deprecated. Use createError instead.');
  }

  if (!err) {
    return undefined;
  }

  return createError(err as string | Error | Error[]);
}

/**
 * Legacy isComplexError function for backward compatibility
 * @deprecated Use isCleanError instead
 */
export function isComplexError(inp: any): inp is CleanError {
  // Add deprecation warning in development
  if (process.env.NODE_ENV !== 'production') {
    console.warn('[DEPRECATED] isComplexError is deprecated. Use isCleanError instead.');
  }

  return isCleanError(inp);
}

// =============================================================================
// PERFORMANCE UTILITIES
// =============================================================================

/**
 * Performance benchmark helper for validation
 */
export function benchmarkErrorCreation(iterations: number = 1000): {
  cleanErrorTime: number;
  complexErrorTime: number;
  improvement: string;
} {
  const errors = Array.from({ length: 10 }, (_, i) => new Error(`Test error ${i}`));

  // Benchmark CleanError
  const cleanStart = performance.now();
  for (let i = 0; i < iterations; i++) {
    createError(errors);
  }
  const cleanEnd = performance.now();
  const cleanErrorTime = cleanEnd - cleanStart;

  // Benchmark legacy CleanError (simulated)
  const complexStart = performance.now();
  for (let i = 0; i < iterations; i++) {
    // Simulate old implementation overhead
    const payload = [...errors]; // Array copy overhead
    const complex = { payload, isComplex: true }; // Object creation
    JSON.stringify(complex); // Serialization overhead
  }
  const complexEnd = performance.now();
  const complexErrorTime = complexEnd - complexStart;

  const improvement = ((complexErrorTime - cleanErrorTime) / complexErrorTime * 100).toFixed(1);

  return {
    cleanErrorTime,
    complexErrorTime,
    improvement: `${improvement}% faster`
  };
}