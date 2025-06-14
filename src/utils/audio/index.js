// Main audio utilities export
export { audioEngine } from './AudioEngine.js'
export { sampleManager, SampleManager } from './SampleManager.js'
export { soundNames, DrumSounds } from './DrumSounds.js'

// Convenience functions for backward compatibility and ease of use
export async function initAudio() {
  const { audioEngine } = await import('./AudioEngine.js')
  await audioEngine.initialize()

  // Return legacy-compatible API
  return {
    audioContext: {
      currentTime: 0, // Tone.js handles timing differently
      createGain: () => ({
        gain: { value: 1 },
        connect: () => {},
      }),
      state: 'running',
      resume: async () => {},
    },
    masterGain: {
      gain: {
        get value() {
          return audioEngine.getMasterVolume()
        },
        set value(vol) {
          audioEngine.setMasterVolume(vol)
        },
      },
      connect: () => {},
    },
  }
}

export async function playDrumSound(soundName, options = {}) {
  const { drumSoundsInstance } = await import('./DrumSounds.js')
  return drumSoundsInstance.playSound(soundName, options)
}

export async function loadCustomSample(name, file) {
  const { sampleManager } = await import('./SampleManager.js')
  return sampleManager.loadCustomSample(name, file)
}

export async function playCustomSample(name, options = {}) {
  const { sampleManager } = await import('./SampleManager.js')
  return sampleManager.playSample(name, options)
}

export async function setMasterVolume(volume) {
  const { audioEngine } = await import('./AudioEngine.js')
  audioEngine.setMasterVolume(volume)
}

// File validation utilities
export function validateAudioFile(file) {
  const validTypes = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/ogg', 'audio/m4a']
  const maxSize = 10 * 1024 * 1024 // 10MB

  if (!validTypes.includes(file.type)) {
    return { valid: false, error: 'Invalid file type. Please use MP3, WAV, OGG, or M4A files.' }
  }

  if (file.size > maxSize) {
    return { valid: false, error: 'File too large. Maximum size is 10MB.' }
  }

  return { valid: true }
}
