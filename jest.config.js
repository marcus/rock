export default {
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest',
  },
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js',
    '**/__tests__/**/*.test.jsx',
    '**/__tests__/**/*.spec.jsx'
  ],
  collectCoverageFrom: [
    'server/**/*.js',
    'src/**/*.{js,jsx}',
    '!server/node_modules/**',
    '!server/db/roysrock.db*',
    '!**/tests/**',
    '!**/__tests__/**'
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testTimeout: 10000,
  verbose: true,
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
  }
} 