function set(data, path, value) {
  if (typeof data === 'object') {
    const parts = path.split('.')
    if (Array.isArray(parts)) {
      const curr = parts.shift()
      if (parts.length > 0) {
        if (!data[curr]) {
          if (Number.isNaN(Number(parts[0]))) data[curr] = {}
          else data[curr] = []
        }
        set(data[curr], parts.join('.'), value)
      } else data[path] = value
    } else {
      data[path] = value
    }
  }
}

exports.set = set