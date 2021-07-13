import 'jest'
import { Context, ContextSymbol } from '../context'

describe('context', () => {
  it('create a context object as Proxy', () => {
    const context: { name: string; age?: number } = { name: 'alex', age: 43 }
    const ctx = Context.ensure(context)
    expect(ctx.name).toBe('alex')
    expect(ctx.age).toBe(43)
    expect(context.name).toBe('alex')
    expect(context.age).toBe(43)
    delete ctx.age
    expect(context.age).toBeUndefined()
    expect('name' in ctx).toBeTruthy()
    expect(Context.isContext(ctx)).toBeTruthy()
    expect(ctx).toMatchSnapshot('create-proxy')
  })

  it("didn't messedup anything in target", () => {
    const context = { name: 'alex', age: 43 }
    const ctx = Context.ensure(context)
    expect(() => ((ctx.get as any) = 10)).toThrow()
    expect(() => ((ctx.__parent as any) = 10)).not.toThrow()
    expect(() => delete ctx.__parent).toThrow()
    expect(() => delete ctx.__stack).toThrow()
    expect(() => ((ctx.__stack as any) = 10)).not.toThrow()
  })

  it('not mention anythisn from context as it has own that', () => {
    const context = { name: 'alex', age: 43 }
    const ctx = Context.ensure(context)
    expect('get' in ctx).toBeFalsy()
  })

  it('returns context as it name', () => {
    const context = { name: 'alex', age: 43 }
    const ctx = Context.ensure(context)
    expect(ctx.toString()).toBe('[pipeline Context]')
    expect(String(ctx)).toBe('[pipeline Context]')
  })

  it('ensures object', () => {
    const context = { name: 'alex' }
    const ctx = Context.ensure(context)
    expect(ctx).toHaveProperty('name')
    const ctx2 = Context.ensure(ctx)
    expect(ctx2 == ctx).toBeTruthy()
    expect(Context.isContext(ctx)).toBeTruthy()
    expect(Context.isContext(ctx2)).toBeTruthy()
    expect(ctx).toMatchSnapshot('ensure')
    expect(ctx2).toMatchSnapshot('ensure')
    expect(ctx.hasChild(ctx)).toBeFalsy()
  })

  it('toObject', () => {
    const context = {
      name: 'alex',
      address: { city: 'NCH', State: 'RO', country: 'RU' },
    }
    const ctx = Context.ensure(context)
    const obj = ctx.toObject()
    expect(obj).toMatchObject(context)
  })

  it('fork', () => {
    const context = {
      name: 'alex',
      address: { city: 'NCH', State: 'RO', country: 'RU' },
    }
    const ctx = Context.ensure(context)
    const ctx2 = ctx.fork({ name: 'Egor' })
    expect(ctx2.address.State).toBe('RO')
    expect(ctx2).toMatchSnapshot('Egor')

    const parent = ctx2.getParent()
    expect(parent).not.toBeUndefined()
    expect(Context.isContext(parent)).toBeTruthy()
    expect(parent == ctx).toBeTruthy()
    expect(ctx.hasChild(ctx2)).toBeTruthy()
  })

  it('get', () => {
    const context = {
      name: 'alex',
      address: { city: 'NCH', State: 'RO', country: 'RU' },
    }
    const ctx = Context.ensure(context)
    const ctx2 = ctx.get('address')
    expect(ctx2.State).toBe('RO')
    expect(Context.isContext(ctx2)).toBeTruthy()
    expect(Context.isContext(ctx.address)).toBeTruthy()
    expect(ctx2).toMatchSnapshot('address')

    const parent = ctx2.getParent()
    expect(parent).not.toBeUndefined()
    expect(Context.isContext(parent)).toBeTruthy()
    expect(parent == ctx).toBeTruthy()
    expect(ctx.hasChild(ctx2)).toBeTruthy()
  })
  it('ownkeys works', () => {
    const context = {
      name: 'alex',
      address: { city: 'NCH', State: 'RO', country: 'RU' },
    }
    const ctx = Context.ensure(context)
    expect(Reflect.ownKeys(ctx)).toMatchObject(['name', 'address'])
  })
})
