import 'jest'
import { can_fix_error } from './can_fix_error'
describe('can_fix_error', () => {
  it('detect that function with 3 params', () => {
    expect(can_fix_error((err, inp, done) => {})).toBeTruthy()
  })
  it('detect async function with 2 params', () => {
    expect(can_fix_error(async (err, inp) => {})).toBeTruthy()
  })
  it("detect sync function without error param can't hold errors", () => {
    expect(can_fix_error(inp => {})).toBeFalsy()
    expect(can_fix_error(() => {})).toBeFalsy()
  })
})
