import { defineConfig } from 'tsup'

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/whatsapp/index.ts',
    'src/telegram/index.ts',
    'src/facebook/index.ts',
    'src/instagram/index.ts',
    'src/slack/index.ts',
    'src/discord/index.ts',
  ],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  external: ['@sendbandit/shared'],
})
