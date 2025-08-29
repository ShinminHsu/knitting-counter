import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()] as any,
  test: {
    name: 'integration',
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/integration/setup.ts'],
    include: ['src/__tests__/integration/**/*.test.{ts,tsx}'],
    exclude: [
      'node_modules/**',
      'dist/**',
      'src/**/*.{unit,component}.test.{ts,tsx}'
    ],
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage/integration',
      exclude: [
        'node_modules/**',
        'src/__tests__/**',
        'src/**/*.test.{ts,tsx}',
        'src/**/*.d.ts',
        'coverage/**',
        'dist/**',
        '*.config.{js,ts}',
        'src/main.tsx'
      ],
      thresholds: {
        global: {
          branches: 60,
          functions: 60,
          lines: 60,
          statements: 60
        }
      }
    },
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 5000
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  esbuild: {
    target: 'node14'
  }
})