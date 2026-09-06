const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
    testDir: './tests/browser',
    timeout: 20000,
    expect: { timeout: 4000 },
    workers: 1,
    use: { baseURL: 'http://127.0.0.1:4173', channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge', headless: true, reducedMotion: 'reduce', serviceWorkers: 'block' },
    webServer: { command: 'node tools/serve.cjs 4173', url: 'http://127.0.0.1:4173', reuseExistingServer: false }
});