import {
  commitIsolatedStageContext,
  createIsolatedStageContext,
} from '../utils/context_snapshot'

class CustomBox {
  constructor(public value: number) {}
}

describe('context_snapshot', () => {
  it('clones richer runtime values without mutating the source', () => {
    const source = {
      buffer: Buffer.from('hello'),
      map: new Map<any, any>([['alpha', { count: 1 }]]),
      set: new Set<any>([{ label: 'x' }]),
      typed: new Uint16Array([1, 2, 3]),
      box: new CustomBox(5),
    }

    const isolated = createIsolatedStageContext(source)

    expect(isolated).not.toBe(source)
    expect(Buffer.isBuffer(isolated.buffer)).toBe(true)
    expect(isolated.buffer).not.toBe(source.buffer)
    expect(isolated.buffer.toString()).toBe('hello')
    expect(isolated.map).not.toBe(source.map)
    expect(isolated.set).not.toBe(source.set)
    expect(isolated.typed).not.toBe(source.typed)
    expect(isolated.box).toBeInstanceOf(CustomBox)

    isolated.buffer.write('j')
    isolated.map.get('alpha').count = 2
    const isolatedSetValue = Array.from(isolated.set.values())[0]
    isolatedSetValue.label = 'y'
    isolated.typed[0] = 9
    isolated.box.value = 11

    expect(source.buffer.toString()).toBe('hello')
    expect(source.map.get('alpha').count).toBe(1)
    expect(Array.from(source.set.values())[0].label).toBe('x')
    expect(Array.from(source.typed)).toEqual([1, 2, 3])
    expect(source.box.value).toBe(5)
  })

  it('commits richer runtime values back to the target context', () => {
    const target = {
      buffer: Buffer.from('hello'),
      map: new Map<any, any>([['alpha', { count: 1 }]]),
      set: new Set<any>([{ label: 'x' }]),
      typed: new Uint16Array([1, 2, 3]),
      box: new CustomBox(5),
    }

    const isolated = createIsolatedStageContext(target)
    isolated.buffer = Buffer.from('world')
    isolated.map = new Map<any, any>([['beta', { count: 9 }]])
    isolated.set = new Set<any>([{ label: 'z' }])
    isolated.typed = new Uint16Array([4, 5])
    isolated.box = new CustomBox(42)

    const committed = commitIsolatedStageContext(target, isolated)

    expect(committed).toBe(target)
    expect(target.buffer.toString()).toBe('world')
    expect(Array.from(target.map.keys())).toEqual(['beta'])
    expect(target.map.get('beta').count).toBe(9)
    expect(Array.from(target.set.values())[0].label).toBe('z')
    expect(Array.from(target.typed)).toEqual([4, 5])
    expect(target.box).toBeInstanceOf(CustomBox)
    expect(target.box.value).toBe(42)
  })

  it('rejects unsupported weak/runtime-only handles explicitly', () => {
    const weakMapKey = {}
    const weakSetValue = {}
    const weakMap = new WeakMap<object, any>([[weakMapKey, { n: 1 }]])
    const weakSet = new WeakSet<object>([weakSetValue])
    const promise = Promise.resolve({ n: 1 })

    expect(() => createIsolatedStageContext({ weakMap } as any)).toThrow(
      'Unsupported timeout snapshot value',
    )
    expect(() => createIsolatedStageContext({ weakSet } as any)).toThrow(
      'Unsupported timeout snapshot value',
    )
    expect(() => createIsolatedStageContext({ promise } as any)).toThrow(
      'Unsupported timeout snapshot value',
    )

    if (typeof WeakRef !== 'undefined') {
      const weakRef = new WeakRef({ n: 1 })
      expect(() => createIsolatedStageContext({ weakRef } as any)).toThrow(
        'Unsupported timeout snapshot value',
      )
    }

    if (typeof FinalizationRegistry !== 'undefined') {
      const registry = new FinalizationRegistry(() => {})
      expect(() => createIsolatedStageContext({ registry } as any)).toThrow(
        'Unsupported timeout snapshot value',
      )
    }
  })
})
