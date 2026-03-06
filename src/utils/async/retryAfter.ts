export async function retryAfter<T>(
  promiseFactory: () => Promise<T> | T,
  timeout: number,
  maxAttempts: number = Infinity,
): Promise<T> {
  let attempts = 0;
  while (true) {
    let timeoutId: NodeJS.Timeout | null = null
    try {
      return await Promise.try(promiseFactory);
    } catch (err) {
      attempts++;
      if (attempts >= maxAttempts) {
        throw new Error(`Max attempts (${maxAttempts}) reached: ${err}`);
      }
      const { promise, resolve } = Promise.withResolvers<void>()
      timeoutId = setTimeout(resolve, timeout)
      await promise
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
    }
  }
}