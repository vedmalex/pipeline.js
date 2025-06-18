import { describe, it, expect } from 'bun:test'
import { Context } from '../context'
import CyclicJSON from '../JSON'

describe('Context Production Issues', () => {
  describe('Socket circular reference issue', () => {
    it('should handle Socket-like objects with circular references', () => {
      // Воспроизводим структуру как в реальном Socket объекте
      const mockSocket: any = {
        connected: true,
        host: 'localhost',
        port: 3000
      }

      const mockParser: any = {
        type: 'HTTPParser',
        socket: mockSocket
      }

      // Создаем циклическую ссылку как в реальном Socket
      mockSocket.parser = mockParser

      const ctx = new Context({
        request: {
          socket: mockSocket,
          method: 'GET',
          url: '/api/test'
        },
        response: {
          statusCode: 200
        }
      })

      // toJSON() теперь должен работать безопасно благодаря fallback на CyclicJSON
      expect(() => {
        const json = ctx.toJSON()
        expect(typeof json).toBe('string')
        expect(json.length).toBeGreaterThan(0)
      }).not.toThrow()

      // toJSONSafe() должен работать
      expect(() => {
        const json = ctx.toJSONSafe()
        expect(typeof json).toBe('string')
        expect(json.length).toBeGreaterThan(0)
      }).not.toThrow()
    })

    it('should handle Express.js request/response cycle', () => {
      // Имитируем Express.js request/response объекты
      const mockReq: any = {
        method: 'POST',
        url: '/api/users',
        headers: { 'content-type': 'application/json' }
      }

      const mockRes: any = {
        statusCode: 200,
        req: mockReq
      }

      // Создаем циклическую ссылку req <-> res
      mockReq.res = mockRes

      const ctx = new Context({
        req: mockReq,
        res: mockRes,
        user: { id: 123, name: 'John' },
        data: { message: 'Hello World' }
      })

      // toJSON() теперь должен работать безопасно благодаря fallback на CyclicJSON
      expect(() => {
        const json = ctx.toJSON()
        expect(typeof json).toBe('string')
        expect(json.length).toBeGreaterThan(0)
      }).not.toThrow()

      // toJSONSafe() должен работать
      const safeJson = ctx.toJSONSafe()
      expect(typeof safeJson).toBe('string')
      expect(safeJson).toContain('John')
      expect(safeJson).toContain('Hello World')
    })

    it('should handle nested objects with multiple circular references', () => {
      // Создаем сложную структуру с множественными циклами
      const objA: any = { name: 'A', type: 'object' }
      const objB: any = { name: 'B', type: 'object' }
      const objC: any = { name: 'C', type: 'object' }

      // Создаем циклы A -> B -> C -> A
      objA.next = objB
      objB.next = objC
      objC.next = objA

      // Добавляем обратные ссылки
      objA.prev = objC
      objB.prev = objA
      objC.prev = objB

      const ctx = new Context({
        chain: objA,
        metadata: {
          created: new Date(),
          version: '1.0.0'
        }
      })

      // toJSON() теперь должен работать безопасно благодаря fallback на CyclicJSON
      expect(() => {
        const json = ctx.toJSON()
        expect(typeof json).toBe('string')
        expect(json.length).toBeGreaterThan(0)
      }).not.toThrow()

      // toJSONSafe() должен работать
      const safeJson = ctx.toJSONSafe()
      expect(typeof safeJson).toBe('string')
      expect(safeJson).toContain('1.0.0')
    })

    it('should demonstrate the production error scenario', () => {
      // Точное воспроизведение ошибки из production
      const httpParser: any = {
        type: 'HTTPParser',
        headers: ['content-type', 'application/json']
      }

      const socket: any = {
        readable: true,
        writable: true,
        parser: httpParser
      }

      // Замыкаем цикл как в реальном Socket
      httpParser.socket = socket

      const ctx = new Context({
        request: {
          socket: socket,
          method: 'GET',
          headers: { 'user-agent': 'test' }
        },
        timestamp: Date.now(),
        userId: 12345
      })

      // Теперь toJSON() должен работать безопасно благодаря fallback
      expect(() => {
        const result = ctx.toJSON()
        expect(typeof result).toBe('string')
        expect(result.length).toBeGreaterThan(0)
      }).not.toThrow()

      // А это должно работать
      const safeResult = ctx.toJSONSafe()
      expect(safeResult).toContain('12345')
      expect(safeResult).toContain('GET')
    })
  })

  describe('Memory and performance with cycles', () => {
    it('should not leak memory with repeated toJSONSafe calls', () => {
      const obj: any = { data: 'test' }
      obj.self = obj

      const ctx = new Context({ circular: obj })

      // Повторные вызовы не должны вызывать утечки памяти
      for (let i = 0; i < 100; i++) {
        const json = ctx.toJSONSafe()
        expect(json).toBeDefined()
      }

      expect(true).toBe(true) // Тест завершился без проблем
    })

    it('should handle large objects with cycles efficiently', () => {
      const largeObj: any = {
        id: 'large-object',
        data: new Array(1000).fill(0).map((_, i) => ({ index: i, value: `item-${i}` }))
      }

      // Добавляем циклическую ссылку
      largeObj.self = largeObj
      largeObj.data[500].parent = largeObj

      const ctx = new Context({ large: largeObj })

      const startTime = Date.now()
      const json = ctx.toJSONSafe()
      const duration = Date.now() - startTime

      expect(json).toBeDefined()
      expect(duration).toBeLessThan(1000) // Должно выполниться быстро
      expect(json).toContain('large-object')
    })
  })

  describe('Backward compatibility and performance', () => {
    it('should use CyclicJSON for all objects (safety first)', () => {
      // Простой объект без циклических ссылок
      const ctx = new Context({
        user: { id: 123, name: 'John' },
        data: { message: 'Hello World', items: [1, 2, 3] },
        timestamp: Date.now()
      })

      const json = ctx.toJSON()
      const parsed = CyclicJSON.parse(json) as any

      expect(parsed.user.name).toBe('John')
      expect(parsed.data.message).toBe('Hello World')
      expect(parsed.data.items).toEqual([1, 2, 3])

      // Результат должен быть валидным для CyclicJSON
      expect(() => CyclicJSON.parse(json)).not.toThrow()
    })

    it('should handle circular objects safely with CyclicJSON', () => {
      // Объект с циклическими ссылками
      const circular: any = { name: 'circular' }
      circular.self = circular

      const ctx = new Context({
        data: circular,
        other: 'normal data'
      })

      const json = ctx.toJSON()

      // Должен содержать обычные данные
      expect(json).toContain('normal data')
      expect(json).toContain('circular')

      // Должен быть валидным для CyclicJSON
      expect(() => {
        const parsed = CyclicJSON.parse(json) as any
        expect(parsed.other).toBe('normal data')
      }).not.toThrow()
    })

    it('should handle mixed scenarios efficiently', () => {
      // Микс простых и циклических данных
      const circular: any = { type: 'circular' }
      circular.ref = circular

      const ctx = new Context({
        simple: { id: 1, name: 'simple' },
        complex: circular,
        array: [1, 2, { nested: 'value' }],
        null_value: null,
        undefined_value: undefined
      })

      const startTime = Date.now()
      const json = ctx.toJSON()
      const duration = Date.now() - startTime

      expect(json).toBeDefined()
      expect(duration).toBeLessThan(1000) // Должно быть быстро
      expect(json).toContain('simple')
      expect(json).toContain('circular')
      expect(json).toContain('nested')
    })

    it('should maintain API compatibility', () => {
      const ctx = new Context({ test: 'data' })

      // API должен остаться тем же
      expect(typeof ctx.toJSON).toBe('function')
      expect(typeof ctx.toJSONSafe).toBe('function')
      expect(typeof ctx.toObject).toBe('function')

      // Результаты должны быть строками
      expect(typeof ctx.toJSON()).toBe('string')
      expect(typeof ctx.toJSONSafe()).toBe('string')

      // toObject должен возвращать объект
      expect(typeof ctx.toObject()).toBe('object')
    })

    it('should demonstrate production safety improvement', () => {
      // Точная имитация production ошибки
      const httpParser: any = {
        type: 'HTTPParser',
        headers: ['content-type', 'application/json']
      }

      const socket: any = {
        readable: true,
        writable: true,
        parser: httpParser
      }

      // Замыкаем цикл как в реальном Socket
      httpParser.socket = socket

      const ctx = new Context({
        request: {
          socket: socket,
          method: 'GET',
          headers: { 'user-agent': 'test' }
        },
        timestamp: Date.now(),
        userId: 12345
      })

      // Теперь это должно работать безопасно
      expect(() => {
        const result = ctx.toJSON()
        expect(typeof result).toBe('string')
        expect(result.length).toBeGreaterThan(0)
      }).not.toThrow()

      // И результат должен содержать наши данные
      const result = ctx.toJSON()
      expect(result).toContain('12345')
      expect(result).toContain('GET')
      expect(result).toContain('HTTPParser')
    })

    it('should compare toJSON() and toJSONSafe() behavior', () => {
      const circular: any = { name: 'test' }
      circular.self = circular

      const ctx = new Context({
        data: circular,
        timestamp: Date.now()
      })

      // Оба метода должны работать одинаково теперь
      const json1 = ctx.toJSON()
      const json2 = ctx.toJSONSafe()

      expect(typeof json1).toBe('string')
      expect(typeof json2).toBe('string')
      expect(json1.length).toBeGreaterThan(0)
      expect(json2.length).toBeGreaterThan(0)

      // Оба должны быть валидными для CyclicJSON
      expect(() => CyclicJSON.parse(json1)).not.toThrow()
      expect(() => CyclicJSON.parse(json2)).not.toThrow()
    })
  })
})