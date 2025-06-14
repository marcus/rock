import * as Tone from 'tone'
import { audioEngine } from './AudioEngine.js'
import { sampleLoader } from './SampleLoader.js'

export class DrumSoundsAPI {
  constructor() {
    this.instruments = new Map()
    this.soundsData = []
    this.soundsLoaded = false
    this.isInitialized = false
  }

  async initialize() {
    if (this.isInitialized) return
    
    try {
      // Fetch sounds from API
      const response = await fetch('/api/sounds/default')
      if (!response.ok) {
        throw new Error(`Failed to fetch sounds: ${response.statusText}`)
      }
      
      this.soundsData = await response.json()
      
      // Initialize instruments based on API data
      this.initializeInstruments()
      
      // Load any samples if they exist
      await this.loadSamples()
      
      this.isInitialized = true
      this.soundsLoaded = true
      
      console.log('DrumSoundsAPI initialized with', this.soundsData.length, 'sounds')
    } catch (error) {
      console.error('Failed to initialize DrumSoundsAPI:', error)
      // Fallback to empty state
      this.soundsLoaded = true
      this.isInitialized = true
    }
  }

  async loadSamples() {
    // Filter sounds that use samples
    const sampleSounds = this.soundsData.filter(sound => 
      sound.type === 'sample' && sound.file_path
    )
    
    if (sampleSounds.length === 0) return
    
    try {
      const samplePaths = {}
      sampleSounds.forEach(sound => {
        samplePaths[this.getDrumKey(sound.drum_type)] = sound.file_path
      })
      
      await sampleLoader.loadSamples(samplePaths)
      console.log('Sample sounds loaded successfully')
    } catch (error) {
      console.warn('Some sample sounds failed to load, using synthesis fallback:', error)
    }
  }

  initializeInstruments() {
    // Create synthesis functions for each sound
    this.soundsData.forEach(sound => {
      if (sound.type === 'synthesis' && sound.synthesis_params) {
        const drumKey = this.getDrumKey(sound.drum_type)
        const synthParams = JSON.parse(sound.synthesis_params)
        
        this.instruments.set(drumKey, () => this.createSynthesisInstrument(synthParams))
      }
    })
  }

  getDrumKey(drumType) {
    // Map database drum_type to legacy key names
    const keyMap = {
      'kick': 'kick',
      'snare': 'snare', 
      'hihat_closed': 'hatClosed',
      'hihat_open': 'hatOpen',
      'crash': 'crash',
      'clap': 'clap',
      'cowbell': 'cowbell',
      'tom_low': 'tom',
      'tom_mid': 'tom',
      'tom_high': 'tom'
    }
    return keyMap[drumType] || drumType
  }

  createSynthesisInstrument(synthParams) {
    try {
      if (synthParams.synthType === 'MembraneSynth') {
        const synth = new Tone.MembraneSynth(synthParams.config).connect(audioEngine.getDestination())
        synth.triggerAttackRelease(synthParams.note, synthParams.duration)
        setTimeout(() => synth.dispose(), synthParams.cleanup_delay)
      }
      else if (synthParams.synthType === 'NoiseSynth') {
        const synth = new Tone.NoiseSynth(synthParams.config).connect(audioEngine.getDestination())
        
        if (synthParams.filter) {
          const filter = new Tone.Filter(
            synthParams.filter.frequency, 
            synthParams.filter.type,
            synthParams.filter.Q
          ).connect(audioEngine.getDestination())
          synth.connect(filter)
          
          synth.triggerAttackRelease(synthParams.duration)
          
          setTimeout(() => {
            synth.dispose()
            filter.dispose()
          }, synthParams.cleanup_delay)
        } else {
          if (synthParams.multiple_hits) {
            // For clap - multiple hits
            synthParams.multiple_hits.forEach(delay => {
              synth.triggerAttackRelease(synthParams.duration, `+${delay}`)
            })
          } else {
            synth.triggerAttackRelease(synthParams.duration)
          }
          
          setTimeout(() => synth.dispose(), synthParams.cleanup_delay)  
        }
      }
      else if (synthParams.synthType === 'Dual') {
        // For cowbell - dual synth setup
        const synth1 = new Tone.Synth(synthParams.synth1.config).connect(audioEngine.getDestination())
        const synth2 = new Tone.Synth(synthParams.synth2.config).connect(audioEngine.getDestination())
        
        const filter1 = new Tone.Filter(
          synthParams.synth1.filter.frequency,
          synthParams.synth1.filter.type,
          synthParams.synth1.filter.Q
        ).connect(audioEngine.getDestination())
        
        const filter2 = new Tone.Filter(
          synthParams.synth2.filter.frequency,
          synthParams.synth2.filter.type,
          synthParams.synth2.filter.Q
        ).connect(audioEngine.getDestination())
        
        synth1.connect(filter1)
        synth2.connect(filter2)
        
        synth1.triggerAttackRelease(synthParams.synth1.note, synthParams.duration)
        synth2.triggerAttackRelease(synthParams.synth2.note, synthParams.duration)
        
        setTimeout(() => {
          synth1.dispose()
          synth2.dispose()
          filter1.dispose()
          filter2.dispose()
        }, synthParams.cleanup_delay)
      }
    } catch (error) {
      console.error('Error creating synthesis instrument:', error)
    }
  }

  async playSound(soundName, options = {}) {
    if (!this.isInitialized) {
      await this.initialize()
    }
    
    await audioEngine.ensureInitialized()
    
    // Wait for sounds to load if they haven't yet
    while (!this.soundsLoaded) {
      await new Promise(resolve => setTimeout(resolve, 50))
    }

    // Find the sound data
    const soundData = this.soundsData.find(sound => 
      this.getDrumKey(sound.drum_type) === soundName
    )
    
    if (!soundData) {
      console.warn(`Sound ${soundName} not found`)
      return
    }

    // Check if we should use a sample or synthesis
    if (soundData.type === 'sample' && soundData.file_path && sampleLoader.hasSample(soundName)) {
      // Play sample
      this.playSample(soundName, options)
    } else {
      // Play synthesized sound
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
  }

  playSample(soundName, options = {}) {
    const sample = sampleLoader.getSample(soundName)
    if (!sample) {
      console.warn(`Sample ${soundName} not loaded, falling back to synthesis`)
      const instrument = this.instruments.get(soundName)
      if (instrument) instrument()
      return
    }

    // Create a new player instance for this playback to avoid conflicts
    const player = new Tone.Player({
      url: sample.buffer,
      volume: options.volume !== undefined ? Tone.gainToDb(options.volume) : 0
    }).connect(audioEngine.getDestination())

    player.start()
    
    // Clean up after playback
    setTimeout(() => {
      player.dispose()
    }, 3000)
  }

  getSoundNames() {
    if (!this.isInitialized) {
      // Return legacy sound names for compatibility during initialization
      return ['kick', 'snare', 'hatClosed', 'hatOpen', 'crash', 'clap', 'cowbell', 'tom']
    }
    
    return this.soundsData.map(sound => this.getDrumKey(sound.drum_type))
      .filter((key, index, array) => array.indexOf(key) === index) // Remove duplicates
  }

  dispose() {
    // Individual instruments are disposed after playing
    this.instruments.clear()
  }
}

export const drumSoundsInstance = new DrumSoundsAPI()
export const soundNames = drumSoundsInstance.getSoundNames()

// Legacy compatibility object - matches the old API exactly
export const drumSounds = {
  kick: () => drumSoundsInstance.playSound('kick'),
  snare: () => drumSoundsInstance.playSound('snare'),
  hatClosed: () => drumSoundsInstance.playSound('hatClosed'),
  hatOpen: () => drumSoundsInstance.playSound('hatOpen'),
  crash: () => drumSoundsInstance.playSound('crash'),
  clap: () => drumSoundsInstance.playSound('clap'),
  cowbell: () => drumSoundsInstance.playSound('cowbell'),
  tom: () => drumSoundsInstance.playSound('tom')
}