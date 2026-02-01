import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  external: [
    '@sendbandit/database',
    '@sendbandit/shared',
    '@cloudflare/workers-types',
    '@clerk/backend',
    'drizzle-orm',
    'hono',
    'hono/cors',
    'hono/factory',
    'zod',
  ],
})
