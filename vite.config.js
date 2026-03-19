import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'
import pkg from './package.json'

const isNoHmr = process.env.NO_HMR === 'true';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    wasm(),
    topLevelAwait()
  ],
  define: {
    '__APP_VERSION__': JSON.stringify(pkg.version),
  },
  server: {
    port: 5174,
    hmr: isNoHmr ? false : {
      overlay: true,
    },
    watch: isNoHmr ? null : {
      usePolling: true,
      ignored: ['**/tools/dataset-generator/dataset/**'],
    },
  },
})
