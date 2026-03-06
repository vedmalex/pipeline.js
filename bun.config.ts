import { builtinModules } from 'module'
/// <reference types="@types/bun" />
import { BuildConfig } from 'bun'
import { BuildOptions } from 'esbuild'

interface BuilderConfig {
  entrypoints?: string[] | string
  outdir?: string
  format?: 'esm' | 'cjs'
  target?: 'node' | 'bun' | 'es5'
  external?: string[]
  sourcemap?: 'inline' | 'external' | boolean
  splitting?: boolean
  pkg: {
    dependencies?: Record<string, string>
    peerDependencies?: Record<string, string>
    devDependencies?: Record<string, string>
  }
  define?: Record<string, string>
}

// Функция для Bun
export function createBunConfig(config: BuilderConfig): BuildConfig {
  const {
    pkg,
    entrypoints = ['src/index.ts'],
    outdir = './dist',
    target = 'node',
    format = 'cjs',
    external = [],
    define = {
      PRODUCTION: JSON.stringify(process.env.NODE_ENV === 'production'),
    },
    splitting = true,
    sourcemap = 'inline',
  } = config

  const bunConfig = {
    entrypoints: Array.isArray(entrypoints) ? entrypoints : [entrypoints],
    target,
    define,
    external: Object.keys(pkg.dependencies || {})
      .concat(Object.keys(pkg.peerDependencies || {}))
      .concat(Object.keys(pkg.devDependencies || {}))
      .concat(builtinModules)
      .concat(external),
    outdir,
    format,
    splitting,
    sourcemap,
    minify: {
      whitespace: false,
      syntax: false,
      identifiers: false,
    },
  } as const

  return bunConfig as unknown as BuildConfig
}

// Функция для esbuild
export function createConfig(config: BuilderConfig): BuildOptions {
  const {
    entrypoints = ['src/index.ts'],
    outdir = './dist',
    format = 'cjs',
    target = 'node',
    sourcemap = 'inline',
    pkg,
    external = [],
  } = config

  return {
    entryPoints: Array.isArray(entrypoints) ? entrypoints : [entrypoints],
    bundle: true,
    format,
    platform: target as 'node',
    outdir,
    sourcemap,
    external: Object.keys(pkg.dependencies || {})
      .concat(Object.keys(pkg.peerDependencies || {}))
      .concat(Object.keys(pkg.devDependencies || {}))
      .concat(builtinModules)
      .concat(external),
  }
}

// Пример использования:
/*
import pkg from './package.json' assert { type: 'json' }

// Для Bun
const bunConfig = createConfig({
  pkg,
  entrypoints: 'index.js'
})

const result = await Bun.build(bunConfig)
if (!result.success) {
  throw new AggregateError(result.logs, 'Build failed')
}

// Для esbuild
import { build } from 'esbuild'
const esbuildConfig = createEsbuildConfig({
  pkg,
  entrypoints: 'index.js'
})
await build(esbuildConfig)
*/
