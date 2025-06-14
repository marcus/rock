export default {
  testEnvironment: 'node',
  transform: {},
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js'
  ],
  collectCoverageFrom: [
    'server/**/*.js',
    '!server/node_modules/**',
    '!server/db/roysrock.db*',
    '!**/tests/**'
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testTimeout: 10000,
  verbose: true
} 