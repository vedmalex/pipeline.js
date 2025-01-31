/// <reference types='@types/bun' />
import { createBunConfig, createConfig } from './bun.config.ts'
import pkg from './package.json' assert { type: 'json' }

const entrypoints = ['src/index.ts']

// if (process.env.TOOL === 'bun') {
//   // Create a Bun config from package.json
//   const config = createBunConfig({
//     pkg,
//     entrypoints,
//   })
//   const result = await Bun.build(config)

//   if (!result.success) {
//     throw new AggregateError(result.logs, 'Build failed')
//   }
// } else {
  const { build } = await import('esbuild')
  // Для esbuild
  const esbuildConfig = createConfig({
    target:'es5',
    pkg,
    entrypoints,
  })
  await build(esbuildConfig)
// }
