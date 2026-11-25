import { defineConfig, devices } from '@playwright/test'

// Flussi principali su build di produzione (vite preview), da ospite: telefono e computer.
// In locale si può usare il Chrome di sistema: PW_CHROME=/usr/bin/google-chrome npm run e2e
const executablePath = process.env.PW_CHROME
export default defineConfig({
  testDir: 'e2e',
  testMatch: '**/*.e2e.ts', // non .test/.spec: così vitest non li raccoglie
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: { baseURL: 'http://localhost:4173', locale: 'it-IT', timezoneId: 'Europe/Rome', trace: 'retain-on-failure', launchOptions: { executablePath } },
  projects: [
    { name: 'telefono', use: { ...devices['Pixel 7'] } },
    { name: 'computer', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 860 } } },
  ],
  webServer: { command: 'npx vite preview --port 4173 --strictPort', url: 'http://localhost:4173', reuseExistingServer: !process.env.CI },
})
