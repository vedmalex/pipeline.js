import { ComplexError } from './ComplexError'
import { process_error } from './process_error'

describe('process_error', () => {
  it('use callback to process error', done => {
    process_error('some', err => {
      expect(err).toBeInstanceOf(ComplexError)
      done()
    })
  })
})
