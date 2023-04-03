import { StageSymbol } from '../stage'

// make possibility to context be immutable for debug purposes

export function isStage(obj: unknown): boolean {
  return typeof obj === 'object' && obj !== null && StageSymbol in obj
}
