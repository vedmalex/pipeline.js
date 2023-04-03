import { StageConfig } from '../StageConfig'

export function getNameFrom<R, C extends StageConfig<R>>(config: C): string {
  let result: string = ''
  if (!config.name && config.run) {
    var match = config.run.toString().match(/function\s*(\w+)\s*\(/)
    if (match && match[1]) {
      result = match[1]
    } else {
      result = config.run.toString()
    }
  } else {
    result = config.name ?? ''
  }
  return result
}
