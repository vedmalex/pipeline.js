import 'jest'
import {StageObjectSchema} from './StageObject'

describe("StageObject", () => {
  it('parse only objects', () => {
    expect(()=>StageObjectSchema.parse({})).not.toThrow()
    expect(()=>StageObjectSchema.parse(10)).toThrow()
    expect(()=>StageObjectSchema.parse(new Date())).toThrow()
    expect(()=>StageObjectSchema.parse('some')).toThrow()
  })
})