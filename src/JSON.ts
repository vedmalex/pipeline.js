export type JsonPrimitive = string | number | boolean | null
export type JsonObject = { [key: string]: JsonValue }
export type JsonArray = JsonValue[]
export type JsonValue = JsonPrimitive | JsonObject | JsonArray

export interface RefObject {
  $ref: string
}

export class CyclicJSON {
  static stringify<T>(obj: T): string {
    const seen = new Map<object, string>()
    const pathMap = new Map<string, object>()
    let currentPath: (string | number)[] = []

    function getPath(): string {
      return currentPath.length ? '$.' + currentPath.join('.') : '$'
    }

    function processValue(value: unknown): unknown {
      if (value === null || typeof value !== 'object') {
        return value
      }

      // Handle Buffer before toJSON() call since Buffer has its own toJSON()
      if (Buffer.isBuffer(value)) {
        return { __buffer: value.toString('base64') }
      }

      if (value instanceof Error) {
        const result: any = {
          name: value.name,
          message: value.message,
        }

        if (value.stack) {
          result.stack = value.stack
        }

        if (value.cause) {
          result.cause = processValue(value.cause)
        }

        return result
      }

      if (value instanceof Date) {
        return (value as Date).toISOString()
      }

      if (typeof (value as any).toJSON === 'function') {
        try {
          return (value as any).toJSON()
        } catch (err) {
          // return processValue(value)
        }
      }

      if (seen.has(value as object)) {
        return { $ref: seen.get(value as object) }
      }

      const path = getPath()
      seen.set(value as object, path)
      pathMap.set(path, value as object)

      if (Array.isArray(value)) {
        const result: unknown[] = []
        for (let i = 0; i < value.length; i++) {
          currentPath.push(i)
          result[i] = processValue(value[i])
          currentPath.pop()
        }
        return result
      } else {
        const result: { [key: string]: unknown } = {}
        for (const [key, val] of Object.entries(value)) {
          currentPath.push(key)
          result[key] = processValue(val)
          currentPath.pop()
        }
        return result
      }
    }

    return JSON.stringify(processValue(obj))
  }

    static parse<T>(text: string): T {
    const parsed = JSON.parse(text)

    const isRefObject = (obj: unknown): obj is RefObject => {
      return (
        obj !== null &&
        typeof obj === 'object' &&
        '$ref' in obj &&
        typeof (obj as RefObject).$ref === 'string' &&
        Object.keys(obj).length === 1
      )
    }

    const isBufferObject = (obj: unknown): obj is { __buffer: string } => {
      return (
        obj !== null &&
        typeof obj === 'object' &&
        '__buffer' in obj &&
        typeof (obj as any).__buffer === 'string'
      )
    }

    // Collect all reference placeholders first
    const refs: Array<{ parent: any; key: string | number; path: string }> = []

    const collectRefs = (obj: any, parent?: any, key?: string | number): void => {
      if (obj === null || typeof obj !== 'object') return

      if (isRefObject(obj)) {
        if (parent && key !== undefined) {
          refs.push({ parent, key, path: obj.$ref })
        }
        return
      }

      if (Array.isArray(obj)) {
        for (let i = 0; i < obj.length; i++) {
          collectRefs(obj[i], obj, i)
        }
      } else {
        for (const [k, value] of Object.entries(obj)) {
          collectRefs(value, obj, k)
        }
      }
    }

    const getValueByPath = (root: any, path: string): any => {
      if (path === '$') return root

      const parts = path.slice(2).split('.')
      let current = root

      for (const part of parts) {
        if (current === undefined || current === null) return undefined
        current = current[part]
      }

      return current
    }

    const processBuffers = (obj: any): any => {
      if (obj === null || typeof obj !== 'object') return obj

      if (isBufferObject(obj)) {
        return Buffer.from(obj.__buffer, 'base64')
      }

      if (Array.isArray(obj)) {
        for (let i = 0; i < obj.length; i++) {
          obj[i] = processBuffers(obj[i])
        }
      } else {
        for (const [key, value] of Object.entries(obj)) {
          obj[key] = processBuffers(value)
        }
      }

      return obj
    }

    // Step 1: Process buffers
    processBuffers(parsed)

    // Step 2: Collect all refs
    collectRefs(parsed)

    // Step 3: Resolve all refs to actual objects
    for (const ref of refs) {
      const target = getValueByPath(parsed, ref.path)
      if (target !== undefined) {
        ref.parent[ref.key] = target
      }
    }

    return parsed as T
  }
}

export default CyclicJSON
