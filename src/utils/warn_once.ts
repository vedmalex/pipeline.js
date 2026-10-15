const warnedKeys = new Set<string>()

export function warnOnce(key: string, message: string) {
  if (warnedKeys.has(key)) {
    return
  }

  warnedKeys.add(key)
  console.warn(message)
}

export function __resetWarnOnceForTests() {
  warnedKeys.clear()
}
