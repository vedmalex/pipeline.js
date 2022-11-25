type CallbackType<T> =
  | (() => void)
  | ((err?: Error) => void)
  | ((err?: Error | undefined | null, value?: T) => void)
  | ((...args) => void)

const t1: CallbackType<number> = () => {}
const t2: CallbackType<number> = (err: Error) => {
  throw err
}

const t3: CallbackType<number> = (
  err: Error | undefined | null,
  value: number,
) => {
  if (err) {
    console.log(err)
  } else {
    console.log(value)
  }
}

interface TestCase {
  value: number
  cb: CallbackType<number>
}

type CaseInit = {
  value: number
  callback: CallbackType<number>
}
class Case implements TestCase {
  value: number
  cb: CallbackType<number>
  constructor({ value, callback }: CaseInit) {
    this.value = value
    this.cb = callback
  }
}

const tc = new Case({ value: 10, callback: t3 })

export function process_error<T>(err: unknown, done: CallbackType<T>) {
  if (err instanceof Error) {
    done(err)
  } else if (typeof err == 'string') {
    done(new Error(err))
  } else {
    done(new Error(String(err)))
  }
}
