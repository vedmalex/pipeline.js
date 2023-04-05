import { CallbackFunctionWrap, isCallbackFunction } from './CallbackFunction'

describe('Callback function', () => {
  it('validate callback', () => {
    expect(isCallbackFunction(() => {})).toBeTruthy()
    expect(isCallbackFunction(err => {})).toBeTruthy()
    expect(isCallbackFunction((err, data) => {})).toBeTruthy()
    expect(isCallbackFunction((err, data, some) => {})).toBeFalsy()
  })
  it('can wrap only proper function', () => {
    expect(() => CallbackFunctionWrap(() => {})).not.toThrow()
    expect(() => CallbackFunctionWrap(err => {})).not.toThrow()
    expect(() => CallbackFunctionWrap((err, data) => {})).not.toThrow()
    expect(() => CallbackFunctionWrap((err, data, some) => {})).toThrow()
  })
})
