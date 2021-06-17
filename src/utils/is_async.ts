export function is_async(inp: any): boolean {
  return inp?.constructor?.name == 'AsyncFunction'
}
