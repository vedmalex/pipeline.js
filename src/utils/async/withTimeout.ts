
export function withTimeout(promise: Promise<any>, timeout: number) {
  const { promise: timeoutPromise, reject } = Promise.withResolvers<never>()
  if (timeout !== Infinity) {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Operation timed out after ${timeout}ms`))
    }, timeout)

    // TypeScript теперь уверен, что timeoutId будет присвоен перед возвратом
    return Promise.race([
      promise.finally(() => clearTimeout(timeoutId)),
      timeoutPromise,
    ])
  } else {
    return promise
  }
}
