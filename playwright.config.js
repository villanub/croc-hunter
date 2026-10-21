const { defineConfig, devices } = require("@playwright/test");
module.exports = defineConfig({
  testDir: "./tests/browser",
  fullyParallel: true,
  use: { baseURL: "http://127.0.0.1:8087", trace: "retain-on-failure" },
  projects: [
    {
      name: "desktop-chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1100 },
      },
    },
    { name: "mobile-chromium", use: { ...devices["Pixel 7"] } },
    { name: "desktop-firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "mobile-webkit", use: { ...devices["iPhone 13"] } },
  ],
  webServer: {
    command: "node server.js",
    env: { PORT: "8087", HOST: "127.0.0.1" },
    url: "http://127.0.0.1:8087/healthz",
    reuseExistingServer: !process.env.CI,
  },
});
