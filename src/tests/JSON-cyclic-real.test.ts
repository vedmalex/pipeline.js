import { describe, it, expect } from 'bun:test'
import { CyclicJSON } from '../JSON'

describe('CyclicJSON Real Cyclic References Tests', () => {
  describe('Basic circular reference functionality', () => {
    it('should handle simple self-reference (obj.self = obj)', () => {
      // Тест основан на: node -e "const obj = { name: 'John' }; obj.self = obj; ..."
      const obj: any = { name: 'John' }
      obj.self = obj

      // Проверяем исходное состояние
      expect(obj.self === obj).toBe(true)

      // Полный цикл stringify -> parse
      const serialized = CyclicJSON.stringify(obj)
      const parsed = CyclicJSON.parse<typeof obj>(serialized)

      // Основная проверка: циклическая ссылка должна восстановиться
      expect(parsed.self === parsed).toBe(true)
      expect(parsed.name).toBe('John')
      expect(parsed.self.name).toBe('John')
    })

    it('should handle complex nested circular references', () => {
      // Тест основан на: node -e "const obj = { name: 'John', child: { name: 'Jane' } }; obj.child.parent = obj; ..."
      const obj: any = {
        name: 'John',
        child: { name: 'Jane' }
      }
      obj.child.parent = obj
      obj.self = obj

      // Проверяем исходное состояние
      expect(obj.child.parent === obj).toBe(true)
      expect(obj.self === obj).toBe(true)

      // Полный цикл stringify -> parse
      const serialized = CyclicJSON.stringify(obj)
      const parsed = CyclicJSON.parse<typeof obj>(serialized)

      // Проверяем восстановление сложных циклических ссылок
      expect(parsed.child.parent === parsed).toBe(true)
      expect(parsed.self === parsed).toBe(true)
      expect(parsed.name).toBe('John')
      expect(parsed.child.name).toBe('Jane')
    })
  })

  describe('Serialization format validation', () => {
    it('should produce correct $ref format for simple circular reference', () => {
      // Тест основан на проверке формата сериализации
      const obj: any = { name: 'John' }
      obj.self = obj

      const serialized = CyclicJSON.stringify(obj)

      // Проверяем правильность формата JSON с $ref
      expect(serialized).toBe('{"name":"John","self":{"$ref":"$"}}')

      // Проверяем что это валидный JSON
      expect(() => JSON.parse(serialized)).not.toThrow()

      const parsed = JSON.parse(serialized)
      expect(parsed.name).toBe('John')
      expect(parsed.self).toEqual({ $ref: '$' })
    })

    it('should produce correct $ref format for nested circular reference', () => {
      const obj: any = {
        name: 'John',
        child: { name: 'Jane' }
      }
      obj.child.parent = obj

      const serialized = CyclicJSON.stringify(obj)
      const parsed = JSON.parse(serialized)

      // Проверяем структуру с вложенными ссылками
      expect(parsed.name).toBe('John')
      expect(parsed.child.name).toBe('Jane')
      expect(parsed.child.parent).toEqual({ $ref: '$' })
    })
  })

  describe('Parse algorithm validation', () => {
    it('should correctly resolve $ref back to actual objects', () => {
      // Тест проверяет что parse() правильно разрешает ссылки
      const json = '{"name":"John","self":{"$ref":"$"}}'
      const result = CyclicJSON.parse<any>(json)

      expect(result.name).toBe('John')
      expect(result.self === result).toBe(true)
      expect(typeof result.self).toBe('object')
      expect(result.self.name).toBe('John')
    })

    it('should handle nested $ref resolution', () => {
      const json = '{"name":"John","child":{"name":"Jane","parent":{"$ref":"$"}}}'
      const result = CyclicJSON.parse<any>(json)

      expect(result.name).toBe('John')
      expect(result.child.name).toBe('Jane')
      expect(result.child.parent === result).toBe(true)
    })

    it('should handle array $ref resolution', () => {
      const json = '{"name":"John","children":[{"$ref":"$"}]}'
      const result = CyclicJSON.parse<any>(json)

      expect(result.name).toBe('John')
      expect(Array.isArray(result.children)).toBe(true)
      expect(result.children[0] === result).toBe(true)
    })
  })

  describe('Full cycle validation (stringify -> parse)', () => {
    it('should maintain object identity through full cycle', () => {
      // Комплексный тест полного цикла
      const original: any = {
        id: 1,
        name: 'Root',
        children: []
      }

      const child1: any = {
        id: 2,
        name: 'Child1',
        parent: original
      }

      const child2: any = {
        id: 3,
        name: 'Child2',
        parent: original
      }

      original.children = [child1, child2]
      original.self = original

      // Полный цикл
      const serialized = CyclicJSON.stringify(original)
      const restored = CyclicJSON.parse<typeof original>(serialized)

      // Проверяем все связи
      expect(restored.self === restored).toBe(true)
      expect(restored.children.length).toBe(2)
      expect(restored.children[0].parent === restored).toBe(true)
      expect(restored.children[1].parent === restored).toBe(true)
      expect(restored.children[0].name).toBe('Child1')
      expect(restored.children[1].name).toBe('Child2')
    })

    it('should handle multiple references to the same object', () => {
      const shared: any = { name: 'Shared' }
      const obj: any = {
        first: shared,
        second: shared,
        self: null
      }
      obj.self = obj
      shared.owner = obj

      const serialized = CyclicJSON.stringify(obj)
      const restored = CyclicJSON.parse<typeof obj>(serialized)

      // Проверяем что общие ссылки сохранились
      expect(restored.first === restored.second).toBe(true)
      expect(restored.first.name).toBe('Shared')
      expect(restored.first.owner === restored).toBe(true)
      expect(restored.self === restored).toBe(true)
    })
  })

  describe('Edge cases and error handling', () => {
    it('should handle objects with circular references and special types', () => {
      const date = new Date('2023-01-01')
      const buffer = Buffer.from('test data', 'utf-8')

      const obj: any = {
        created: date,
        data: buffer,
        name: 'Test'
      }
      obj.self = obj

      const serialized = CyclicJSON.stringify(obj)
      const restored = CyclicJSON.parse<typeof obj>(serialized)

      expect(restored.self === restored).toBe(true)
      expect(restored.name).toBe('Test')
      expect(restored.created).toBe(date.toISOString()) // Date becomes string
      expect(Buffer.isBuffer(restored.data)).toBe(true) // Buffer restored
      expect(restored.data.toString('utf-8')).toBe('test data')
    })

    it('should handle deeply nested circular structures', () => {
      // Создаем глубоко вложенную структуру
      let current: any = { level: 0 }
      const root = current

      for (let i = 1; i < 10; i++) {
        const next = { level: i, prev: current }
        current.next = next
        current = next
      }

      // Создаем циклическую ссылку
      current.root = root
      root.leaf = current

      const serialized = CyclicJSON.stringify(root)
      const restored = CyclicJSON.parse<typeof root>(serialized)

      // Проверяем структуру
      expect(restored.level).toBe(0)
      expect(restored.leaf.level).toBe(9)
      expect(restored.leaf.root === restored).toBe(true)

      // Проверяем цепочку
      let curr = restored
      for (let i = 0; i < 9; i++) {
        expect(curr.level).toBe(i)
        curr = curr.next
      }
      expect(curr.level).toBe(9)
      expect(curr.root === restored).toBe(true)
    })

    it('should maintain performance with reasonable object sizes', () => {
      // Тест производительности
      const startTime = Date.now()

      const obj: any = {
        items: Array.from({ length: 100 }, (_, i) => ({
          id: i,
          name: `item-${i}`
        }))
      }
      obj.self = obj

      const serialized = CyclicJSON.stringify(obj)
      const restored = CyclicJSON.parse<typeof obj>(serialized)

      const endTime = Date.now()
      const duration = endTime - startTime

      // Проверяем корректность
      expect(restored.self === restored).toBe(true)
      expect(restored.items.length).toBe(100)
      expect(restored.items[0].name).toBe('item-0')
      expect(restored.items[99].name).toBe('item-99')

      // Проверяем производительность (должно быть быстро)
      expect(duration).toBeLessThan(1000) // Менее 1 секунды
    })
  })

  describe('Comparison with native JSON behavior', () => {
    it('should handle cases where native JSON.stringify would fail', () => {
      const obj: any = { name: 'Test' }
      obj.self = obj

      // Native JSON.stringify should throw
      expect(() => JSON.stringify(obj)).toThrow()

      // CyclicJSON should handle it gracefully
      expect(() => CyclicJSON.stringify(obj)).not.toThrow()

      const serialized = CyclicJSON.stringify(obj)
      const restored = CyclicJSON.parse<typeof obj>(serialized)

      expect(restored.self === restored).toBe(true)
    })

    it('should produce JSON-compatible output for non-circular objects', () => {
      const obj = {
        name: 'John',
        age: 30,
        hobbies: ['reading', 'coding']
      }

      const cyclicResult = CyclicJSON.stringify(obj)
      const nativeResult = JSON.stringify(obj)

      // Для объектов без циклических ссылок результат должен быть одинаковым
      expect(cyclicResult).toBe(nativeResult)

      const cyclicParsed = CyclicJSON.parse(cyclicResult)
      const nativeParsed = JSON.parse(nativeResult)

      expect(cyclicParsed).toEqual(nativeParsed)
    })
  })
})