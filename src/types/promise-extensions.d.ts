/**
 * Type declarations for Promise extensions available in Node.js / Bun
 * that are not yet in TypeScript's built-in lib declarations.
 *
 * - Promise.withResolvers() — available since Node.js 22 / Bun 1.x (ES2024 proposal)
 * - Promise.try()           — available in Bun 1.x (TC39 stage-4)
 *
 * These are runtime-available APIs. This shim only adds TypeScript type information.
 */

interface PromiseWithResolvers<T> {
  promise: Promise<T>
  resolve: (value: T | PromiseLike<T>) => void
  reject: (reason?: unknown) => void
}

interface PromiseConstructor {
  /**
   * Creates a new Promise and returns it along with its resolve and reject functions.
   * Available in Node.js >= 22, Bun >= 1.x.
   */
  withResolvers<T>(): PromiseWithResolvers<T>

  /**
   * Calls the given function and returns a Promise that resolves with its return value,
   * or rejects with a thrown error. Wraps synchronous code in a promise safely.
   * Available in Bun >= 1.x, Node.js >= 24 (stage-4 proposal).
   */
  try<T>(fn: (...args: any[]) => T | PromiseLike<T>, ...args: any[]): Promise<T>
}
