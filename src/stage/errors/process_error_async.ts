import { process_error } from './process_error'

export function process_error_async<Output>(err: unknown): Promise<[unknown, Output]> {
  return new Promise(resolve => {
    process_error(err, (err, ctx) => {
      if (err) {
        resolve([err, ctx as Output])
      } else {
        resolve([undefined, ctx as Output])
      }
    })
  })
}
