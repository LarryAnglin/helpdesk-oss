/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:5173',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: false,
    screenshotOnRunFailure: true,
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'cypress/support/e2e.ts'
  },
  component: {
    devServer: {
      framework: 'react',
      bundler: 'vite',
      viteConfig: {
        server: {
          port: 5173
        }
      }
    },
    specPattern: 'src/**/__tests__/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'cypress/support/component.ts'
  },
  env: {
    TEST_USER_EMAIL: 'test@example.com',
    TEST_USER_PASSWORD: 'testPassword123',
    FIREBASE_PROJECT_ID: 'test-project',
    // Use Firebase emulators for testing
    FIRESTORE_EMULATOR_HOST: 'localhost:8080',
    FIREBASE_AUTH_EMULATOR_HOST: 'localhost:9099'
  },
  retries: {
    runMode: 2,
    openMode: 0
  }
});