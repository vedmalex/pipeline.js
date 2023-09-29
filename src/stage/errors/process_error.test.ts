import { ComplexError } from './ComplexError'
import { process_error } from './process_error'

describe('process_error', () => {
  it('use callback to process error', done => {
    process_error('some', arg => {
      if (arg.result === 'failure') {
        expect(arg.reason).toBeInstanceOf(ComplexError)
      }
      done()
    })
  })
})
