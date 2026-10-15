export type BenchStats = {
  median: number
  min: number
  max: number
  runs: number[]
}

export function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid]
}

export async function measure(
  fn: () => Promise<void>,
  iterations: number,
  warmup: number = 200,
) {
  for (let i = 0; i < warmup; i++) await fn()

  const started = performance.now()
  for (let i = 0; i < iterations; i++) await fn()
  return ((performance.now() - started) / iterations) * 1000
}

export async function measureStats(
  fn: () => Promise<void>,
  iterations: number,
  options?: {
    samples?: number
    warmup?: number
  },
): Promise<BenchStats> {
  const samples = options?.samples ?? 5
  const warmup = options?.warmup ?? 200
  const runs: number[] = []

  for (let i = 0; i < samples; i++) {
    runs.push(await measure(fn, iterations, warmup))
  }

  return {
    median: median(runs),
    min: Math.min(...runs),
    max: Math.max(...runs),
    runs,
  }
}

export function scaleStats(stats: BenchStats, divisor: number): BenchStats {
  const runs = stats.runs.map((value) => value / divisor)

  return {
    median: stats.median / divisor,
    min: stats.min / divisor,
    max: stats.max / divisor,
    runs,
  }
}

export function formatStats(stats: BenchStats, digits: number = 2) {
  return `${stats.median.toFixed(digits)} [${stats.min.toFixed(digits)}..${stats.max.toFixed(digits)}]`
}

export function formatRuns(stats: BenchStats, digits: number = 2) {
  return stats.runs.map((value) => value.toFixed(digits)).join(', ')
}
