export function is_async_function(inp?: unknown) {
  if (typeof inp == 'function') {
    return inp?.constructor?.name == 'AsyncFunction'
  } else {
    return false
  }
}
