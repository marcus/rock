// Re-export everything from the new modular audio system
export * from './audio/index.js'

// Legacy compatibility - maintain exact same API as before
export { drumSounds, soundNames } from './audio/DrumSounds.js'