import path from 'path'
import fs from 'fs'
import { execSync } from 'child_process'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const pkg = JSON.parse(fs.readFileSync(new URL('./package.json', import.meta.url), 'utf-8'))

function getGitCommit(): string {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim()
  } catch {
    return 'dev'
  }
}

function getGitBranch(): string {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD').toString().trim()
  } catch {
    return 'main'
  }
}

function getBuildTime(): string {
  try {
    return new Date().toISOString()
  } catch {
    return ''
  }
}

const gitCommit = getGitCommit()
const gitBranch = getGitBranch()
const buildTime = getBuildTime()
const appVersion = pkg.version || '1.11.0'

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
    __GIT_COMMIT__: JSON.stringify(gitCommit),
    __GIT_BRANCH__: JSON.stringify(gitBranch),
    __BUILD_TIME__: JSON.stringify(buildTime),
  },
  server: {
    // Admin usa 5173 (Playwright). Platform no puede ocupar el mismo puerto.
    port: 5174,
    strictPort: true,
  },
  optimizeDeps: {
    include: ['glubox'],
  },
  resolve: {
    alias: [
      { find: '@pages', replacement: path.resolve(__dirname, './src/pages') },
      { find: '@assets', replacement: path.resolve(__dirname, './src/assets') },
      { find: /^@\//, replacement: `${path.resolve(__dirname, './src')}/` },
    ],
  },
})
