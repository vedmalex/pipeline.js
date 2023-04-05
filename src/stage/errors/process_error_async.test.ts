import { ComplexError } from './ComplexError'
import { process_error_async } from './process_error_async'

describe('process_error', () => {
  it('use callback to process error', async () => {
    const [err] = await process_error_async('some')
    expect(err).toBeInstanceOf(ComplexError)
  })
})
