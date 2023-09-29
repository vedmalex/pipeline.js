import { ComplexError } from './ComplexError'
import { process_error_async } from './process_error_async'

describe('process_error', () => {
  it('use callback to process error', async () => {
    const args = await process_error_async('some')
    if(args.result === 'failure'){
      expect(args.reason).toBeInstanceOf(ComplexError)
    }
  })
})
