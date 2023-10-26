/// <reference types='bun-types' />
import { createConfig } from '../../shared/bun.config'
import pkg from './package.json' assert { type: 'json' }

// Create a Bun config from package.json
const config = createConfig({ pkg })

const result = await Bun.build(config)
if (!result.success) {
  throw new AggregateError(result.logs, 'Build failed')
}
