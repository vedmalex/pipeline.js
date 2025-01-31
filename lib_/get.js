
function get(data, path) {
  if (Array.isArray(data)) {
    const result = []
    for (let i = 0, len = data.length; i < len; i += 1) {
      result.push(get(data[i], path))
    }
    return result
  }
  if (typeof data === 'object') {
    if (data[path] === undefined) {
      const parts = path.split('.')
      if (Array.isArray(parts)) {
        const curr = parts.shift()
        if (parts.length > 0) {
          return get(data[curr], parts.join('.'))
        }
        return data[curr]
      }
    }
    return data[path]
  }
  return data
}

exports.get = get
