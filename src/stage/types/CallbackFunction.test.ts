import 'jest'
import * as z from 'zod'
import { isCallbackFunction } from './CallbackFunction'
describe('CallbackFunction', () => {
  it('should validate a function', () => {
    expect(isCallbackFunction(() => {})).toBe(true)
    expect(isCallbackFunction(err => {})).toBe(true)
    expect(isCallbackFunction((err, ctx) => {})).toBe(true)
    expect(isCallbackFunction((err, ctx, another) => {})).toBe(false)
  })
  it('works with function', () => {
    const myFunction = z.function(z.tuple([z.string(), z.number()]), z.boolean())
    expect(
      myFunction.implement((some: string, other: number) => {
        return Boolean(some + other)
      })('one', 1),
    ).toBe(true)
    type myFunction = z.infer<typeof myFunction>
  })
})
