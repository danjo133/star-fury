import { defineConfig } from 'vite';
import { resolve } from 'path';
import { execSync } from 'child_process';

// Plugin to compile TypeScript AudioWorklet files to public/
function compileWorklets() {
  return {
    name: 'compile-worklets',
    buildStart() {
      execSync('npx esbuild src/audio/sid-worklet-processor.ts --bundle --format=esm --outfile=public/sid-worklet-processor.js', {
        cwd: resolve(__dirname),
        stdio: 'pipe',
      });
    },
  };
}

export default defineConfig({
  base: '/star-fury/',
  plugins: [compileWorklets()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  build: {
    target: 'ES2022',
    outDir: 'dist',
  },
});
