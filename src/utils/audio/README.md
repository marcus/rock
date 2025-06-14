# Audio System

A modular audio system built with Tone.js that supports both built-in drum sounds and custom uploaded audio files.

## Quick Start

```javascript
import { initAudio, playDrumSound, loadCustomSample, playCustomSample } from '../utils/audioUtils.js'

// Initialize the audio system
await initAudio()

// Play built-in drum sounds
await playDrumSound('kick')
await playDrumSound('snare', { volume: 0.8 })

// Load and play custom samples
const file = // ... File object from input
await loadCustomSample('myKick', file)
await playCustomSample('myKick', { volume: 0.9, playbackRate: 1.2 })
```

## Architecture

### AudioEngine
- Manages Tone.js initialization
- Handles master volume control
- Provides audio destination for all sounds

### DrumSounds
- Built-in synthesized drum sounds using Tone.js
- Includes: kick, snare, hatClosed, hatOpen, crash, clap, cowbell, tom
- Uses appropriate Tone.js synthesizers (MembraneSynth, NoiseSynth, etc.)

### SampleManager
- Handles custom uploaded audio files (MP3, WAV, OGG, M4A)
- Supports loading from File objects or URLs
- Manages sample playback with options (volume, playback rate, etc.)

## API Reference

### Built-in Sounds
```javascript
import { playDrumSound, soundNames } from '../utils/audioUtils.js'

// Get all available sound names
console.log(soundNames) // ['kick', 'snare', 'hatClosed', ...]

// Play with options
await playDrumSound('kick', { volume: 0.8 })
```

### Custom Samples
```javascript
import { loadCustomSample, playCustomSample, validateAudioFile } from '../utils/audioUtils.js'

// Validate file before loading
const validation = validateAudioFile(file)
if (!validation.valid) {
  console.error(validation.error)
  return
}

// Load custom sample
const success = await loadCustomSample('customDrum', file)
if (success) {
  // Play with options
  await playCustomSample('customDrum', {
    volume: 0.9,
    playbackRate: 1.2, // Speed up playback
    startTime: 0.1     // Start 100ms from now
  })
}
```

### Volume Control
```javascript
import { setMasterVolume, audioEngine } from '../utils/audioUtils.js'

// Set master volume (0-1)
await setMasterVolume(0.7)

// Get current volume
const currentVolume = audioEngine.getMasterVolume()
```

## File Support
- **Supported formats**: MP3, WAV, OGG, M4A
- **Maximum file size**: 10MB
- **Validation**: Built-in file validation with helpful error messages 