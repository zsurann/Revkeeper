import { defineConfig, devices } from '@playwright/test'

// Flussi principali su build di produzione (vite preview), da ospite: telefono e computer.
// In locale si può usare il Chrome di sistema: PW_CHROME=/usr/bin/google-chrome npm run e2e
const executablePath = process.env.PW_CHROME

const SAFARI26 =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1'
const CHROME_IOS =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/131.0.6778.73 Mobile/15E148 Safari/604.1'

const iosGuide = (name: string, device: (typeof devices)[string], userAgent: string, browserName: 'chromium' | 'webkit' = 'chromium') => ({
  name,
  testMatch: '**/install.e2e.ts' as const,
  use: { ...device, userAgent, browserName },
})

export default defineConfig({
  testDir: 'e2e',
  testMatch: '**/*.e2e.ts', // non .test/.spec: così vitest non li raccoglie
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: { baseURL: 'http://localhost:4173', locale: 'it-IT', timezoneId: 'Europe/Rome', trace: 'retain-on-failure', launchOptions: { executablePath } },
  projects: [
    { name: 'telefono', testIgnore: '**/install.e2e.ts', use: { ...devices['Pixel 7'] } },
    // Safari vero (WebKit) sui flussi principali. I contesti di Playwright sono effimeri come la navigazione privata,
    // dove WebKit non salva Blob in IndexedDB: i flussi con foto e allegati restano su Chrome (la PWA installata non è privata)
    { name: 'safari', testMatch: '**/flussi.e2e.ts', grepInvert: /interventi: registra|documenti: scadenza/, use: { ...devices['iPhone 13'], browserName: 'webkit' } },
    { name: 'computer', testIgnore: '**/install.e2e.ts', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 860 } } },
    iosGuide('iphone-se', devices['iPhone SE'], SAFARI26),
    iosGuide('iphone-13', devices['iPhone 13'], SAFARI26),
    iosGuide('iphone-15', devices['iPhone 15'], SAFARI26),
    iosGuide('iphone-chrome', devices['iPhone 13'], CHROME_IOS),
    iosGuide('iphone-webkit', devices['iPhone 13'], SAFARI26, 'webkit'),
  ],
  webServer: { command: 'npx vite preview --port 4173 --strictPort', url: 'http://localhost:4173', reuseExistingServer: !process.env.CI },
})
