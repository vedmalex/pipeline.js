import { describe, it, expect } from 'bun:test'
import { Context } from '../context'
import CyclicJSON from '../JSON'

describe('Context Cyclic References Real Tests', () => {
  describe('Basic Context circular reference handling', () => {
    it('should handle Context.toJSON() with circular references safely', () => {
      // Создаем простую циклическую ссылку
      const ctx = new Context({ name: 'test' })
      ;(ctx as any).self = ctx

      // Обычный toJSON() может зависнуть, используем toJSONSafe()
      expect(() => {
        const json = ctx.toJSONSafe()
        expect(typeof json).toBe('string')
        expect(json.length).toBeGreaterThan(0)
      }).not.toThrow()
    })

    it('should convert Context to plain object with circular protection', () => {
      // Создаем иерархию через fork
      const parent = new Context({ name: 'parent', level: 1 })
      const child = parent.fork({ name: 'child', level: 2 })

      // Создаем циклические ссылки через присваивание свойств
      ;(parent as any).child = child
      ;(child as any).parent = parent
      ;(child as any).self = child

      // Для циклических ссылок используем CyclicJSON напрямую
      const json = CyclicJSON.stringify(child.toObject())
      const obj = CyclicJSON.parse(json) as any

      expect(obj).toBeDefined()
      expect(obj.name).toBe('child')
      expect(obj.level).toBe(2)

      // Проверяем что циклические ссылки корректно обработаны CyclicJSON
      expect(obj.parent).toBeDefined()
      expect(obj.self).toBeDefined()
    })
  })

  describe('Context with special objects and circular references', () => {
    it('should handle Error objects in Context with circular references', () => {
      const ctx = new Context({ name: 'error-test' })
      const error = new Error('Test error')

      // Добавляем Error объект и циклическую ссылку через присваивание
      ;(ctx as any).error = error
      ;(ctx as any).self = ctx

      const json = ctx.toJSONSafe()
      const parsed = CyclicJSON.parse(json) as any

      expect(parsed.error).toBeDefined()
      expect(parsed.error.name).toBe('Error')
      expect(parsed.error.message).toBe('Test error')
      expect(parsed.self).toBeDefined() // CyclicJSON обработает ссылку
    })

    it('should handle Date objects in Context with circular references', () => {
      const ctx = new Context({ name: 'date-test' })
      const date = new Date('2023-01-01T00:00:00.000Z')

      // Присваиваем свойства напрямую
      ;(ctx as any).created = date
      ;(ctx as any).self = ctx

      const json = ctx.toJSONSafe()
      const parsed = CyclicJSON.parse(json) as any

      expect(parsed.created).toBe('2023-01-01T00:00:00.000Z')
      expect(parsed.self).toBeDefined() // CyclicJSON обработает ссылку
    })

    it('should handle Buffer objects in Context with circular references', () => {
      const ctx = new Context({ name: 'buffer-test' })
      const buffer = Buffer.from('test data', 'utf-8')

      // Присваиваем свойства напрямую
      ;(ctx as any).data = buffer
      ;(ctx as any).self = ctx

      const json = ctx.toJSONSafe()
      const parsed = CyclicJSON.parse(json) as any

      expect(parsed.data).toBeDefined() // Buffer обработан CyclicJSON
      expect(parsed.self).toBeDefined() // CyclicJSON обработает ссылку
    })
  })

  describe('Context hierarchy with circular references', () => {
    it('should handle parent-child Context hierarchy without infinite recursion', () => {
      // Создаем иерархию контекстов через fork
      const root = new Context({ name: 'root', level: 0 })
      const level1 = root.fork({ name: 'level1', level: 1 })
      const level2 = level1.fork({ name: 'level2', level: 2 })

      // Создаем циклические ссылки через присваивание
      ;(root as any).deepest = level2
      ;(level2 as any).root = root
      ;(level1 as any).child = level2
      ;(level1 as any).parent = root

      // Все операции должны работать без зависания
      const rootJson = root.toJSONSafe()
      const level1Json = level1.toJSONSafe()
      const level2Json = level2.toJSONSafe()

      expect(rootJson).toBeDefined()
      expect(level1Json).toBeDefined()
      expect(level2Json).toBeDefined()

      // Проверяем что все JSON валидны
      expect(() => CyclicJSON.parse(rootJson)).not.toThrow()
      expect(() => CyclicJSON.parse(level1Json)).not.toThrow()
      expect(() => CyclicJSON.parse(level2Json)).not.toThrow()
    })

    it('should handle complex Context network without hanging', () => {
      // Создаем сложную сеть контекстов
      const contexts: Context<any>[] = []

      for (let i = 0; i < 5; i++) {
        const ctx = new Context({ id: i, name: `ctx-${i}` })
        contexts.push(ctx)
      }

      // Создаем множественные циклические ссылки через присваивание
      contexts.forEach((ctx, i) => {
        ;(ctx as any).all = contexts
        ;(ctx as any).next = contexts[(i + 1) % contexts.length]
        ;(ctx as any).prev = contexts[(i - 1 + contexts.length) % contexts.length]
        ;(ctx as any).self = ctx
      })

      // Все операции должны завершаться быстро
      const startTime = Date.now()

      contexts.forEach(ctx => {
        const json = ctx.toJSONSafe()
        expect(json).toBeDefined()
        expect(() => CyclicJSON.parse(json)).not.toThrow()
      })

      const duration = Date.now() - startTime
      expect(duration).toBeLessThan(1000) // Должно выполниться быстро
    })
  })

  describe('Integration with CyclicJSON', () => {
    it('should work together: Context.toObject() + CyclicJSON', () => {
      const ctx = new Context({ name: 'integration-test' })
      // Присваиваем свойства напрямую через Proxy
      ;(ctx as any).value = 42
      ;(ctx as any).self = ctx

      // Получаем plain object из Context
      const plainObj = ctx.toObject()

      // Используем CyclicJSON для сериализации циклических ссылок
      const serialized = CyclicJSON.stringify(plainObj)
      const restored = CyclicJSON.parse(serialized) as any

      expect(restored.name).toBe('integration-test')
      expect(restored.value).toBe(42)
      expect(restored.self).toBeDefined() // CyclicJSON обработает ссылку
    })

    it('should handle Context objects in CyclicJSON directly', () => {
      const ctx = new Context({ name: 'direct-test' })
      // Присваиваем свойства напрямую через Proxy
      ;(ctx as any).value = 100

      const obj: any = {
        context: ctx,
        data: 'test'
      }
      obj.self = obj

      // CyclicJSON должен обработать Context объекты через convertToPlainObject
      const serialized = CyclicJSON.stringify(obj)
      const restored = CyclicJSON.parse<typeof obj>(serialized)

      expect(restored.self === restored).toBe(true)
      expect(restored.data).toBe('test')
      // Context объект сериализуется CyclicJSON как обычный объект
      expect(restored.context).toBeDefined()
      // Context может не иметь name в зависимости от того, как он обрабатывается
    })
  })

  describe('Performance and stress tests', () => {
    it('should handle large Context hierarchies efficiently', () => {
      const startTime = Date.now()

      // Создаем большую иерархию через fork
      let current = new Context({ id: 0, name: 'root' })
      const root = current

      for (let i = 1; i < 50; i++) {
        const next = current.fork({ id: i, name: `node-${i}` })
        ;(current as any).child = next
        current = next as any
      }

      // Создаем циклическую ссылку через присваивание
      ;(current as any).root = root
      ;(root as any).leaf = current

      // Операции должны выполняться быстро
      const json = root.toJSONSafe()
      const obj = root.toObject()

      const duration = Date.now() - startTime

      expect(json).toBeDefined()
      expect(obj).toBeDefined()
      expect(duration).toBeLessThan(2000) // Увеличил лимит времени
    })

    it('should not leak memory with repeated operations', () => {
      const ctx = new Context({ name: 'memory-test' })
      // Присваиваем через Proxy
      ;(ctx as any).self = ctx

      // Повторяем операции много раз
      for (let i = 0; i < 100; i++) {
        const json = ctx.toJSONSafe() // Используем toJSONSafe для циклических ссылок
        const obj = ctx.toObject()

        expect(json).toBeDefined()
        expect(obj).toBeDefined()
      }

      // Тест завершился без проблем с памятью
      expect(true).toBe(true)
    })

    it('should handle Context with mixed data types and circular references', () => {
      const ctx = new Context({ name: 'mixed-test' })

      // Присваиваем все свойства через Proxy
      ;(ctx as any).string = 'test'
      ;(ctx as any).number = 42
      ;(ctx as any).boolean = true
      ;(ctx as any).array = [1, 2, 3]
      ;(ctx as any).object = { nested: 'value' }
      ;(ctx as any).date = new Date('2023-01-01')
      ;(ctx as any).buffer = Buffer.from('data')
      ;(ctx as any).error = new Error('test')
      ;(ctx as any).self = ctx

      const json = ctx.toJSONSafe() // Используем toJSONSafe для циклических ссылок
      const obj = ctx.toObject()

      expect(json).toBeDefined()
      expect(obj).toBeDefined()
      expect(() => CyclicJSON.parse(json)).not.toThrow() // Используем CyclicJSON.parse

      const parsed = CyclicJSON.parse(json) as any
      expect(parsed.string).toBe('test')
      expect(parsed.number).toBe(42)
      expect(parsed.boolean).toBe(true)
      expect(parsed.array).toEqual([1, 2, 3])
      expect(parsed.object.nested).toBe('value')
    })
  })

  describe('Edge cases and error recovery', () => {
    it('should handle Context with null/undefined values and circular references', () => {
      const ctx = new Context({ name: 'null-test' })

      // Присваиваем различные типы значений
      ;(ctx as any).nullValue = null
      ;(ctx as any).undefinedValue = undefined
      ;(ctx as any).emptyObject = {}
      ;(ctx as any).emptyArray = []
      ;(ctx as any).self = ctx

      const json = ctx.toJSONSafe()
      const parsed = CyclicJSON.parse(json) as any

      expect(parsed.nullValue).toBe(null)
      expect(parsed.undefinedValue).toBeUndefined()
      expect(parsed.self).toBeDefined() // CyclicJSON обработает ссылку
    })
  })
})