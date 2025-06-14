import * as Tone from 'tone'
import { audioEngine } from './AudioEngine.js'

export class DrumSounds {
  constructor() {
    this.instruments = new Map()
    this.initializeInstruments()
  }

  initializeInstruments() {
    // Kick drum - using MembraneSynth for realistic kick
    this.instruments.set('kick', () => {
      const kick = new Tone.MembraneSynth({
        pitchDecay: 0.05,
        octaves: 10,
        oscillator: { type: 'sine' },
        envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 1.4 }
      }).connect(audioEngine.getDestination())
      
      kick.triggerAttackRelease('C1', '8n')
      
      // Clean up after sound finishes
      setTimeout(() => kick.dispose(), 2000)
    })

    // Snare - using NoiseSynth with filtering
    this.instruments.set('snare', () => {
      const snare = new Tone.NoiseSynth({
        noise: { type: 'white' },
        envelope: { attack: 0.001, decay: 0.2, sustain: 0 }
      }).connect(audioEngine.getDestination())
      
      const filter = new Tone.Filter(1000, 'bandpass').connect(audioEngine.getDestination())
      snare.connect(filter)
      
      snare.triggerAttackRelease('8n')
      
      setTimeout(() => {
        snare.dispose()
        filter.dispose()
      }, 1000)
    })

    // Closed Hi-hat
    this.instruments.set('hatClosed', () => {
      const hat = new Tone.NoiseSynth({
        noise: { type: 'white' },
        envelope: { attack: 0.001, decay: 0.1, sustain: 0 }
      }).connect(audioEngine.getDestination())
      
      const filter = new Tone.Filter(8000, 'highpass').connect(audioEngine.getDestination())
      hat.connect(filter)
      
      hat.triggerAttackRelease('32n')
      
      setTimeout(() => {
        hat.dispose()
        filter.dispose()
      }, 500)
    })

    // Open Hi-hat
    this.instruments.set('hatOpen', () => {
      const hat = new Tone.NoiseSynth({
        noise: { type: 'white' },
        envelope: { attack: 0.001, decay: 0.4, sustain: 0 }
      }).connect(audioEngine.getDestination())
      
      const filter = new Tone.Filter(6000, 'highpass').connect(audioEngine.getDestination())
      hat.connect(filter)
      
      hat.triggerAttackRelease('4n')
      
      setTimeout(() => {
        hat.dispose()
        filter.dispose()
      }, 1000)
    })

    // Crash cymbal
    this.instruments.set('crash', () => {
      const crash = new Tone.NoiseSynth({
        noise: { type: 'white' },
        envelope: { attack: 0.001, decay: 1.5, sustain: 0 }
      }).connect(audioEngine.getDestination())
      
      const filter = new Tone.Filter(3000, 'highpass').connect(audioEngine.getDestination())
      crash.connect(filter)
      
      crash.triggerAttackRelease('2n')
      
      setTimeout(() => {
        crash.dispose()
        filter.dispose()
      }, 2000)
    })

    // Clap - multiple short bursts
    this.instruments.set('clap', () => {
      const clap = new Tone.NoiseSynth({
        noise: { type: 'white' },
        envelope: { attack: 0.001, decay: 0.03, sustain: 0 }
      }).connect(audioEngine.getDestination())
      
      const filter = new Tone.Filter(1100, 'bandpass', -12).connect(audioEngine.getDestination())
      clap.connect(filter)
      
      // Multiple quick bursts for clap effect
      clap.triggerAttackRelease('64n')
      clap.triggerAttackRelease('64n', '+0.01')
      clap.triggerAttackRelease('64n', '+0.02')
      
      setTimeout(() => {
        clap.dispose()
        filter.dispose()
      }, 500)
    })

    // Cowbell - deep and resonant metallic sound
    this.instruments.set('cowbell', () => {
      const cowbell = new Tone.Synth({
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.001, decay: 0.4, sustain: 0.1, release: 0.3 }
      }).connect(audioEngine.getDestination())
      
      const cowbell2 = new Tone.Synth({
        oscillator: { type: 'sawtooth' },
        envelope: { attack: 0.001, decay: 0.3, sustain: 0.05, release: 0.2 }
      }).connect(audioEngine.getDestination())
      
      // Add resonant filter for metallic character
      const filter = new Tone.Filter({
        frequency: 800,
        type: 'bandpass',
        Q: 8
      }).connect(audioEngine.getDestination())
      
      const filter2 = new Tone.Filter({
        frequency: 1200,
        type: 'bandpass',
        Q: 6
      }).connect(audioEngine.getDestination())
      
      cowbell.connect(filter)
      cowbell2.connect(filter2)
      
      // Lower, deeper frequencies for more resonance
      cowbell.triggerAttackRelease('D4', '4n')
      cowbell2.triggerAttackRelease('A4', '4n')
      
      setTimeout(() => {
        cowbell.dispose()
        cowbell2.dispose()
        filter.dispose()
        filter2.dispose()
      }, 1500)
    })

    // Tom - using MembraneSynth
    this.instruments.set('tom', () => {
      const tom = new Tone.MembraneSynth({
        pitchDecay: 0.1,
        octaves: 6,
        oscillator: { type: 'sine' },
        envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 1 }
      }).connect(audioEngine.getDestination())
      
      tom.triggerAttackRelease('G2', '4n')
      
      setTimeout(() => tom.dispose(), 1500)
    })
  }

  async playSound(soundName, options = {}) {
    await audioEngine.ensureInitialized()
    
    const instrument = this.instruments.get(soundName)
    if (!instrument) {
      console.warn(`Drum sound ${soundName} not found`)
      return
    }

    // Apply volume if specified
    if (options.volume !== undefined) {
      const currentVolume = audioEngine.getMasterVolume()
      audioEngine.setMasterVolume(options.volume)
      
      // Reset volume after a short delay
      setTimeout(() => {
        audioEngine.setMasterVolume(currentVolume)
      }, 100)
    }

    instrument()
  }

  getSoundNames() {
    return Array.from(this.instruments.keys())
  }

  dispose() {
    // Individual instruments are disposed after playing
    this.instruments.clear()
  }
}

export const drumSoundsInstance = new DrumSounds()
export const soundNames = drumSoundsInstance.getSoundNames()

// Legacy compatibility object - matches the old API exactly
export const drumSounds = {
  kick: (audioContext, outputGain) => drumSoundsInstance.playSound('kick'),
  snare: (audioContext, outputGain) => drumSoundsInstance.playSound('snare'),
  hatClosed: (audioContext, outputGain) => drumSoundsInstance.playSound('hatClosed'),
  hatOpen: (audioContext, outputGain) => drumSoundsInstance.playSound('hatOpen'),
  crash: (audioContext, outputGain) => drumSoundsInstance.playSound('crash'),
  clap: (audioContext, outputGain) => drumSoundsInstance.playSound('clap'),
  cowbell: (audioContext, outputGain) => drumSoundsInstance.playSound('cowbell'),
  tom: (audioContext, outputGain) => drumSoundsInstance.playSound('tom')
} 