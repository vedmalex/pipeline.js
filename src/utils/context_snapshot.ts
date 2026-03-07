import { Context } from '../context'
import { StageObject } from './types'

function isBufferValue(value: unknown): value is Buffer {
  return typeof Buffer !== 'undefined' && Buffer.isBuffer(value)
}

function isUnsupportedSnapshotObject(value: object) {
  return (
    value instanceof WeakMap ||
    value instanceof WeakSet ||
    value instanceof Promise ||
    (typeof WeakRef !== 'undefined' && value instanceof WeakRef) ||
    (typeof FinalizationRegistry !== 'undefined' && value instanceof FinalizationRegistry)
  )
}

function assertSnapshotSupported(value: object) {
  if (isUnsupportedSnapshotObject(value)) {
    throw new TypeError(
      'Unsupported timeout snapshot value: only plain objects, arrays, Map/Set, Buffer/ArrayBuffer views, Date/RegExp, and enumerable custom instances are supported',
    )
  }
}

function cloneArrayBufferView<T>(value: T): T {
  if (isBufferValue(value)) {
    return Buffer.from(value) as T
  }

  if (value instanceof DataView) {
    return new DataView(
      value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength),
    ) as T
  }

  const Ctor = (value as any).constructor
  return new Ctor(value as any) as T
}

function cloneValue<T>(value: T, seen?: WeakMap<object, any>): T {
  if (value === null || typeof value !== 'object') {
    return value
  }

  if (typeof value === 'function') {
    return value
  }

  if (!seen) {
    seen = new WeakMap<object, any>()
  }

  assertSnapshotSupported(value as object)

  if (Context.isContext(value)) {
    return cloneValue((value as any).toObject(), seen)
  }

  if (seen.has(value as object)) {
    return seen.get(value as object)
  }

  if (Array.isArray(value)) {
    const cloned: any[] = []
    seen.set(value, cloned)

    for (const item of value) {
      cloned.push(cloneValue(item, seen))
    }

    return cloned as T
  }

  if (value instanceof Map) {
    const cloned = new Map()
    seen.set(value, cloned)

    for (const [key, item] of Array.from(value.entries())) {
      cloned.set(cloneValue(key, seen), cloneValue(item, seen))
    }

    return cloned as T
  }

  if (value instanceof Set) {
    const cloned = new Set()
    seen.set(value, cloned)

    for (const item of Array.from(value.values())) {
      cloned.add(cloneValue(item, seen))
    }

    return cloned as T
  }

  if (value instanceof ArrayBuffer) {
    return value.slice(0) as T
  }

  if (ArrayBuffer.isView(value)) {
    return cloneArrayBufferView(value)
  }

  if (value instanceof Date) {
    return new Date(value.getTime()) as T
  }

  if (value instanceof RegExp) {
    return new RegExp(value.source, value.flags) as T
  }

  const cloned = Object.create(Object.getPrototypeOf(value))
  seen.set(value as object, cloned)

  for (const key of Reflect.ownKeys(value as object)) {
    ;(cloned as any)[key] = cloneValue((value as any)[key], seen)
  }

  return cloned
}

function toPlainStageObject<T extends StageObject>(ctx: T): T {
  if (Context.isContext(ctx)) {
    return (ctx as any).toObject()
  }

  return ctx
}

function syncObject(target: any, source: any) {
  if (Array.isArray(target) && Array.isArray(source)) {
    target.length = 0
    for (const item of source) {
      target.push(cloneValue(item))
    }
    return
  }

  const targetKeys = Object.keys(target ?? {})
  const sourceKeys = Object.keys(source ?? {})
  const sourceKeySet = new Set(sourceKeys)

  for (const key of targetKeys) {
    if (!sourceKeySet.has(key)) {
      delete target[key]
    }
  }

  for (const key of sourceKeys) {
    target[key] = cloneValue(source[key])
  }
}

function syncMap(target: Map<any, any>, source: Map<any, any>) {
  target.clear()
  for (const [key, value] of Array.from(source.entries())) {
    target.set(cloneValue(key), cloneValue(value))
  }
}

function syncSet(target: Set<any>, source: Set<any>) {
  target.clear()
  for (const value of Array.from(source.values())) {
    target.add(cloneValue(value))
  }
}

function commitValue<T>(target: T, source: T): T {
  if (!target || typeof target !== 'object') {
    return cloneValue(source)
  }

  if (Array.isArray(target) && Array.isArray(source)) {
    syncObject(target, source)
    return target
  }

  if (target instanceof Map && source instanceof Map) {
    syncMap(target, source)
    return target
  }

  if (target instanceof Set && source instanceof Set) {
    syncSet(target, source)
    return target
  }

  if (target instanceof ArrayBuffer && source instanceof ArrayBuffer) {
    return cloneValue(source)
  }

  if (ArrayBuffer.isView(target) && ArrayBuffer.isView(source)) {
    return cloneValue(source)
  }

  syncObject(target, source)
  return target
}

export function createIsolatedStageContext<T extends StageObject>(ctx: T): T {
  const cloned = cloneValue(toPlainStageObject(ctx))
  return Context.isContext(ctx) ? (Context.ensure(cloned as any) as T) : cloned
}

export function commitIsolatedStageContext<T extends StageObject>(
  target: T,
  source: T,
): T {
  const plainSource = cloneValue(toPlainStageObject(source))
  return commitValue(target, plainSource)
}
