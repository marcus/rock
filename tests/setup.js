// Test setup file

// Suppress console output during tests to reduce noise
const originalConsole = global.console
global.console = {
  ...originalConsole,
  log: () => {},
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {}
} 