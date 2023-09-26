import { process_error } from './process_error'

export function process_error_async<R>(err: unknown): Promise<[unknown, R]> {
  return new Promise(resolve => {
    process_error(err, (err, ctx) => {
      if (err) {
        resolve([err, ctx as R])
      } else {
        resolve([undefined, ctx as R])
      }
    })
  })
}
