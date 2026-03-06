import { describe, it, expect } from 'bun:test'
import CyclicJSON from '../JSON'

describe('CyclicJSON', () => {
  describe('stringify', () => {
    it('should handle primitive values', () => {
      expect(CyclicJSON.stringify(123)).toBe('123')
      expect(CyclicJSON.stringify('test')).toBe('"test"')
      expect(CyclicJSON.stringify(true)).toBe('true')
      expect(CyclicJSON.stringify(null)).toBe('null')
    })

    it('should handle simple objects without circular references', () => {
      const obj = { name: 'John', age: 30 }
      expect(CyclicJSON.stringify(obj)).toBe('{"name":"John","age":30}')
    })

    it('should handle arrays without circular references', () => {
      const arr = [1, 2, { name: 'John' }]
      expect(CyclicJSON.stringify(arr)).toBe('[1,2,{"name":"John"}]')
    })

    it('should handle direct circular reference', () => {
      const obj: any = { name: 'John' }
      obj.self = obj
      const result = CyclicJSON.stringify(obj)
      expect(result).toBe('{"name":"John","self":{"$ref":"$"}}')
    })

    it('should handle nested circular reference', () => {
      const obj: any = {
        name: 'John',
        child: {
          name: 'Jane',
          parent: null,
        },
      }
      obj.child.parent = obj
      const result = CyclicJSON.stringify(obj)
      expect(result).toBe(
        '{"name":"John","child":{"name":"Jane","parent":{"$ref":"$"}}}',
      )
    })

    it('should handle circular references in arrays', () => {
      const obj: any = { name: 'John', children: [] }
      obj.children.push(obj)
      const result = CyclicJSON.stringify(obj)
      expect(result).toBe('{"name":"John","children":[{"$ref":"$"}]}')
    })

    it('should handle multiple references to the same object', () => {
      const child = { name: 'Jane' }
      const obj = {
        name: 'John',
        firstChild: child,
        secondChild: child,
      }
      const result = CyclicJSON.stringify(obj)
      expect(result).toBe(
        '{"name":"John","firstChild":{"name":"Jane"},"secondChild":{"$ref":"$.firstChild"}}',
      )
    })
  })

  describe('parse', () => {
    it('should handle primitive values', () => {
      expect(CyclicJSON.parse<number>('123')).toBe(123)
      expect(CyclicJSON.parse<string>('"test"')).toBe('test')
      expect(CyclicJSON.parse<boolean>('true')).toBe(true)
      expect(CyclicJSON.parse<null>('null')).toBe(null)
    })

    it('should handle simple objects without circular references', () => {
      const json = '{"name":"John","age":30}'
      const result = CyclicJSON.parse<{name: string, age: number}>(json)
      expect(result).toEqual({ name: 'John', age: 30 })
    })

    it('should handle direct circular reference', () => {
      const json = '{"name":"John","self":{"$ref":"$"}}'
      const result: any = CyclicJSON.parse(json)
      expect(result.name).toBe('John')
      expect(result.self).toBe(result)
    })

    it('should handle nested circular reference', () => {
      const json =
        '{"name":"John","child":{"name":"Jane","parent":{"$ref":"$"}}}'
      const result: any = CyclicJSON.parse(json)
      expect(result.name).toBe('John')
      expect(result.child.name).toBe('Jane')
      expect(result.child.parent).toBe(result)
    })

    it('should handle circular references in arrays', () => {
      const json = '{"name":"John","children":[{"$ref":"$"}]}'
      const result: any = CyclicJSON.parse(json)
      expect(result.name).toBe('John')
      expect(result.children[0]).toBe(result)
    })

    it('should handle multiple references to the same object', () => {
      const json =
        '{"name":"John","firstChild":{"name":"Jane"},"secondChild":{"$ref":"$.firstChild"}}'
      const result: any = CyclicJSON.parse(json)
      expect(result.firstChild).toBe(result.secondChild)
      expect(result.firstChild.name).toBe('Jane')
    })
  })

  describe('complex scenarios', () => {
    interface Department {
      name: string
      head: Employee
      employees: Employee[]
    }

    interface Employee {
      name: string
      department: Department
      supervisor: Employee | null
    }

    it('should handle complex organizational structure', () => {
      // Создаем сложную организационную структуру
      const department: Department = {
        name: 'Engineering',
        head: {} as Employee,
        employees: [],
      }

      const head: Employee = {
        name: 'Alice',
        department,
        supervisor: null,
      }

      const employee: Employee = {
        name: 'Bob',
        department,
        supervisor: head,
      }

      department.head = head
      department.employees = [head, employee]

      // Сериализуем и десериализуем
      const serialized = CyclicJSON.stringify(department)
      const deserialized = CyclicJSON.parse<Department>(serialized)

      // Проверяем структуру
      expect(deserialized.name).toBe('Engineering')
      expect(deserialized.head.name).toBe('Alice')
      expect(deserialized.employees.length).toBe(2)
      expect(deserialized.head).toBe(deserialized.employees[0])
      expect(deserialized.employees[1].supervisor).toBe(deserialized.head)
      expect(deserialized.head.department).toBe(deserialized)
    })

    it('should handle deeply nested structures with multiple circular references', () => {
      interface Node {
        id: number
        parent: Node | null
        children: Node[]
        root: Node
      }

      // Создаем дерево с множественными ссылками
      const root: Node = {
        id: 1,
        parent: null,
        children: [],
        root: {} as Node,
      }
      root.root = root

      const child1: Node = {
        id: 2,
        parent: root,
        children: [],
        root: root,
      }

      const child2: Node = {
        id: 3,
        parent: root,
        children: [],
        root: root,
      }

      root.children = [child1, child2]

      const serialized = CyclicJSON.stringify(root)
      const deserialized = CyclicJSON.parse<Node>(serialized)

      expect(deserialized.id).toBe(1)
      expect(deserialized.children.length).toBe(2)
      expect(deserialized.children[0].parent).toBe(deserialized)
      expect(deserialized.children[1].parent).toBe(deserialized)
      expect(deserialized.root).toBe(deserialized)
      expect(deserialized.children[0].root).toBe(deserialized)
      expect(deserialized.children[1].root).toBe(deserialized)
    })
  })

  describe('error cases', () => {
    it('should handle invalid JSON', () => {
      expect(() => CyclicJSON.parse('invalid json')).toThrow()
    })

    it('should handle invalid reference paths', () => {
      const json = '{"name":"John","ref":{"$ref":"$.nonexistent"}}'
      const result: any = CyclicJSON.parse(json)
      // Invalid references should return the original ref object
      expect(result.ref).toEqual({ $ref: "$.nonexistent" })
    })

    it('should handle null values in paths', () => {
      const obj = {
        a: null,
        b: { ref: { $ref: '$.a' } },
      }
      const required = {
        a: null,
        b: { ref: null },
      }
      const serialized = CyclicJSON.stringify(obj)
      const deserialized = CyclicJSON.parse(serialized)
      expect(deserialized).toEqual(required)
    })
  })
  describe('Buffer handling', () => {
    it('should serialize and deserialize Buffer correctly', () => {
      const buf = Buffer.from('Hello, World!', 'utf-8')
      const obj = { data: buf }

      const serialized = CyclicJSON.stringify(obj)
      const deserialized = CyclicJSON.parse<typeof obj>(serialized)

      expect(deserialized.data).toBeInstanceOf(Buffer)
      expect(deserialized.data.toString('utf-8')).toBe('Hello, World!')
    })

    it('should handle Buffer in nested objects', () => {
      const buf = Buffer.from('Nested Buffer', 'utf-8')
      const obj = { nested: { data: buf } }

      const serialized = CyclicJSON.stringify(obj)
      const deserialized = CyclicJSON.parse<typeof obj>(serialized)

      expect(deserialized.nested.data).toBeInstanceOf(Buffer)
      expect(deserialized.nested.data.toString('utf-8')).toBe('Nested Buffer')
    })

    it('should handle Buffer in arrays', () => {
      const buf1 = Buffer.from('Buffer 1', 'utf-8')
      const buf2 = Buffer.from('Buffer 2', 'utf-8')
      const obj = { buffers: [buf1, buf2] }

      const serialized = CyclicJSON.stringify(obj)
      const deserialized = CyclicJSON.parse<typeof obj>(serialized)

      expect(deserialized.buffers[0]).toBeInstanceOf(Buffer)
      expect(deserialized.buffers[1]).toBeInstanceOf(Buffer)
      expect(deserialized.buffers[0].toString('utf-8')).toBe('Buffer 1')
      expect(deserialized.buffers[1].toString('utf-8')).toBe('Buffer 2')
    })

    it('should handle circular references with Buffer', () => {
      const buf = Buffer.from('Circular Buffer', 'utf-8')
      const obj: any = { data: buf }
      obj.self = obj

      const serialized = CyclicJSON.stringify(obj)
      const deserialized = CyclicJSON.parse<typeof obj>(serialized)

      expect(deserialized.data).toBeInstanceOf(Buffer)
      expect(deserialized.data.toString('utf-8')).toBe('Circular Buffer')
      expect(deserialized.self).toBe(deserialized)
    })
  })
})
