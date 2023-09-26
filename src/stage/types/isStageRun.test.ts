import 'jest'
import { isStageRun } from './isStageRun'

describe('isStageRun', () => {
  it('isStageRun', () => {
    expect(isStageRun((err,data,callback)=>{})).toBe(true)
    expect(isStageRun(100)).toBe(false)
  })
})
