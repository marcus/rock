import * as Tone from 'tone'
import { audioEngine } from './AudioEngine.js'
import { sampleLoader } from './SampleLoader.js'

export class DrumSoundsAPI {
  constructor() {
    this.instruments = new Map()
    this.soundsData = []
    this.soundsLoaded = false
    this.isInitialized = false
    // Persistent Tone.Player instances for each loaded sample to avoid Safari scheduling latency
    this.samplePlayers = new Map()
    // Reverb system
    this.reverbBuffer = null
    this.convolver = null
    this.reverbSend = null
    this.dryGain = null
    this.reverbInitialized = false
  }

  async initializeReverb() {
    if (this.reverbInitialized) return
    
    try {
      // Ensure audio context is started
      await Tone.start()
      
      // Create impulse response buffer for reverb using current context sample rate
      const sampleRate = Tone.getContext().sampleRate
      const length = Math.floor(sampleRate * 2) // 2 seconds of reverb
      const impulse = new Float32Array(length)
      
      // Create a decaying noise impulse response
      for (let i = 0; i < length; i++) {
        const decay = Math.pow(1 - i / length, 2)
        impulse[i] = (Math.random() * 2 - 1) * decay
      }
      
      // Create audio buffer with correct sample rate
      this.reverbBuffer = Tone.getContext().createBuffer(1, length, sampleRate)
      this.reverbBuffer.copyToChannel(impulse, 0)
      
      // Create convolver node
      this.convolver = new Tone.Convolver()
      this.convolver.buffer = this.reverbBuffer
      
      // Create gain nodes for wet/dry mix
      this.reverbSend = new Tone.Gain(0) // Start with no reverb
      this.dryGain = new Tone.Gain(1)
      
      // Connect reverb chain
      this.reverbSend.connect(this.convolver)
      this.convolver.connect(audioEngine.getDestination())
      this.dryGain.connect(audioEngine.getDestination())
      
      this.reverbInitialized = true
      console.log('Reverb system initialized with sample rate:', sampleRate)
    } catch (error) {
      console.error('Failed to initialize reverb:', error)
    }
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
      
      // Don't initialize reverb here - it will be initialized lazily when first needed
    } catch (error) {
      console.error('Failed to initialize DrumSoundsAPI:', error)
      // Fallback to empty state
      this.soundsLoaded = true
      this.isInitialized = true
    }
  }

  async loadSamples() {
    // Filter sounds that use samples
    const sampleSounds = this.soundsData.filter(sound => sound.type === 'sample' && sound.file_path)

    if (sampleSounds.length === 0) return

    try {
      const samplePaths = {}
      sampleSounds.forEach(sound => {
        samplePaths[this.getDrumKey(sound.drum_type, sound.id)] = sound.file_path
      })

      await sampleLoader.loadSamples(samplePaths)

      // After samples are loaded, create persistent Tone.Player instances for each sample.
      sampleSounds.forEach(sound => {
        const drumKey = this.getDrumKey(sound.drum_type, sound.id)
        if (!this.samplePlayers.has(drumKey) && sampleLoader.hasSample(drumKey)) {
          const player = new Tone.Player({
            url: sampleLoader.getSample(drumKey).buffer,
            retrigger: true, // allow retriggering while the sample is still playing
            onstop: () => {},
          }).connect(audioEngine.getDestination())
          this.samplePlayers.set(drumKey, player)
        }
      })
      console.log('Sample sounds loaded successfully')
    } catch (error) {
      console.warn('Some sample sounds failed to load, using synthesis fallback:', error)
    }
  }

  initializeInstruments() {
    // Create synthesis functions for each sound
    this.soundsData.forEach(sound => {
      if (sound.type === 'synthesis' && sound.synthesis_params) {
        const drumKey = this.getDrumKey(sound.drum_type, sound.id)
        const synthParams = JSON.parse(sound.synthesis_params)

        this.instruments.set(drumKey, () => this.createSynthesisInstrument(synthParams))
      }
    })
  }

  getDrumKey(drumType, soundId = null) {
    // For dynamic sounds, use a combination of drum_type and id to ensure uniqueness
    if (soundId) {
      return `${drumType}_${soundId}`
    }

    // Map database drum_type to legacy key names for default sounds
    const keyMap = {
      kick: 'kick',
      snare: 'snare',
      hihat_closed: 'hatClosed',
      hihat_open: 'hatOpen',
      crash: 'crash',
      clap: 'clap',
      cowbell: 'cowbell',
      tom_low: 'tom',
      tom_mid: 'tom',
      tom_high: 'tom',
    }
    return keyMap[drumType] || drumType
  }

  createSynthesisInstrument(synthParams) {
    try {
      if (synthParams.synthType === 'MembraneSynth') {
        const synth = new Tone.MembraneSynth(synthParams.config).connect(
          audioEngine.getDestination()
        )
        synth.triggerAttackRelease(synthParams.note, synthParams.duration)
        setTimeout(() => synth.dispose(), synthParams.cleanup_delay)
      } else if (synthParams.synthType === 'NoiseSynth') {
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
      } else if (synthParams.synthType === 'Dual') {
        // For cowbell - dual synth setup
        const synth1 = new Tone.Synth(synthParams.synth1.config).connect(
          audioEngine.getDestination()
        )
        const synth2 = new Tone.Synth(synthParams.synth2.config).connect(
          audioEngine.getDestination()
        )

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
    const soundData = this.soundsData.find(sound => this.getDrumKey(sound.drum_type) === soundName)

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
    const player = this.samplePlayers.get(soundName)
    if (!player) {
      console.warn(`Sample player for ${soundName} not found, falling back to synthesis`)
      const instrument = this.instruments.get(soundName)
      if (instrument) instrument()
      return
    }

    // Apply volume for this hit only
    if (options.volume !== undefined) {
      player.volume.setValueAtTime(Tone.gainToDb(options.volume), Tone.now())
    }

    player.start()
  }

  getSoundNames() {
    if (!this.isInitialized) {
      return []
    }

    return this.soundsData
      .map(sound => this.getDrumKey(sound.drum_type, sound.id))
      .filter((key, index, array) => array.indexOf(key) === index) // Remove duplicates
  }

  // Add a new sound to the loaded sounds
  async addSound(soundData) {
    if (!soundData) return false

    // Check if sound is already loaded
    const existingSound = this.soundsData.find(sound => sound.id === soundData.id)
    if (existingSound) {
      console.warn(`Sound ${soundData.name} is already loaded`)
      return false
    }

    // Add to soundsData
    this.soundsData.push(soundData)

    // Use unique key for dynamic sounds
    const drumKey = this.getDrumKey(soundData.drum_type, soundData.id)

    // Initialize instrument if it's a synthesis sound
    if (soundData.type === 'synthesis' && soundData.synthesis_params) {
      const synthParams = JSON.parse(soundData.synthesis_params)
      this.instruments.set(drumKey, () => this.createSynthesisInstrument(synthParams))
    }

    // Load sample if it's a sample sound
    if (soundData.type === 'sample' && soundData.file_path) {
      try {
        const samplePaths = { [drumKey]: soundData.file_path }
        await sampleLoader.loadSamples(samplePaths)

        // Create persistent player for the sample
        if (sampleLoader.hasSample(drumKey)) {
          const player = new Tone.Player({
            url: sampleLoader.getSample(drumKey).buffer,
            retrigger: true,
            onstop: () => {},
          }).connect(audioEngine.getDestination())
          this.samplePlayers.set(drumKey, player)
        }
      } catch (error) {
        console.warn(`Failed to load sample for ${soundData.name}:`, error)
      }
    }

    return true
  }

  // Remove a sound from the loaded sounds
  removeSound(soundData) {
    if (!soundData) return false

    // Find and remove from soundsData
    const soundIndex = this.soundsData.findIndex(sound => sound.id === soundData.id)
    if (soundIndex === -1) {
      console.warn(`Sound ${soundData.name} not found in loaded sounds`)
      return false
    }

    // Remove from soundsData array
    this.soundsData.splice(soundIndex, 1)

    // Generate the drum key for cleanup
    const drumKey = this.getDrumKey(soundData.drum_type, soundData.id)

    // Clean up instrument if it exists
    if (this.instruments.has(drumKey)) {
      this.instruments.delete(drumKey)
    }

    // Clean up sample player if it exists
    if (this.samplePlayers.has(drumKey)) {
      const player = this.samplePlayers.get(drumKey)
      player.dispose()
      this.samplePlayers.delete(drumKey)
    }

    console.log(`Sound ${soundData.name} removed from DrumSoundsAPI`)
    return true
  }

  // Get sound data by drum key
  getSoundByKey(drumKey) {
    return this.soundsData.find(
      sound =>
        this.getDrumKey(sound.drum_type, sound.id) === drumKey ||
        this.getDrumKey(sound.drum_type) === drumKey
    )
  }

  // Get all loaded sound data
  getAllSounds() {
    return [...this.soundsData]
  }

  dispose() {
    // Individual instruments are disposed after playing
    this.instruments.clear()

    // Dispose persistent sample players
    this.samplePlayers.forEach(player => player.dispose())
    this.samplePlayers.clear()
    
    // Dispose reverb system
    if (this.convolver) {
      this.convolver.dispose()
      this.convolver = null
    }
    if (this.reverbSend) {
      this.reverbSend.dispose()
      this.reverbSend = null
    }
    if (this.dryGain) {
      this.dryGain.dispose()
      this.dryGain = null
    }
    this.reverbBuffer = null
  }

  // Legacy-compatible method that accepts audioContext and gain for perfect timing
  playSoundSync(soundName, audioContext, gain) {
    if (!this.isInitialized || !this.soundsLoaded) {
      console.warn(`Sound system not ready for ${soundName}`)
      return
    }

    // Find the sound data - check both old and new key formats
    const soundData = this.soundsData.find(
      sound =>
        this.getDrumKey(sound.drum_type, sound.id) === soundName ||
        this.getDrumKey(sound.drum_type) === soundName
    )

    if (!soundData) {
      console.warn(`Sound ${soundName} not found`)
      return
    }

    // Get the volume from the Web Audio API gain node
    const volume = gain.gain.value

    // Check if we should use a sample or synthesis
    if (soundData.type === 'sample' && soundData.file_path && sampleLoader.hasSample(soundName)) {
      // Play sample with Tone.js, applying volume
      this.playSampleSync(soundName, volume)
    } else {
      // Play synthesized sound with Tone.js, applying volume
      this.createSynthesisInstrumentSync(soundName, volume)
    }
  }

  playSampleSync(soundName, volume) {
    const player = this.samplePlayers.get(soundName)
    if (!player) {
      console.warn(`Sample player for ${soundName} not found, falling back to synthesis`)
      this.createSynthesisInstrumentSync(soundName, volume)
      return
    }

    player.volume.setValueAtTime(Tone.gainToDb(volume), Tone.now())
    player.start()
  }

  createSynthesisInstrumentSync(soundName, volume) {
    const soundData = this.soundsData.find(
      sound =>
        this.getDrumKey(sound.drum_type, sound.id) === soundName ||
        this.getDrumKey(sound.drum_type) === soundName
    )

    if (!soundData || !soundData.synthesis_params) {
      console.warn(`No synthesis params for ${soundName}`)
      return
    }

    try {
      const synthParams = JSON.parse(soundData.synthesis_params)
      console.log(`Full synthesis params for ${soundName}:`, JSON.stringify(synthParams, null, 2))

      if (synthParams.synthType === 'MembraneSynth') {
        const synth = new Tone.MembraneSynth(synthParams.config).connect(
          audioEngine.getDestination()
        )
        synth.volume.value = Tone.gainToDb(volume)
        synth.triggerAttackRelease(synthParams.note, synthParams.duration)
        setTimeout(() => synth.dispose(), synthParams.cleanup_delay)
      } else if (synthParams.synthType === 'NoiseSynth') {
        const synth = new Tone.NoiseSynth(synthParams.config).connect(audioEngine.getDestination())
        synth.volume.value = Tone.gainToDb(volume)

        if (synthParams.filter) {
          console.log(`Filter config for ${soundName}:`, synthParams.filter)

          // Fix invalid Q parameter - Q should be positive
          const filterQ =
            synthParams.filter.Q && synthParams.filter.Q > 0 ? synthParams.filter.Q : 1

          // Fix invalid rolloff parameter - must be -12, -24, -48, or -96
          let rolloff = synthParams.filter.rolloff || -12
          if (![-12, -24, -48, -96].includes(rolloff)) {
            console.warn(`Invalid rolloff ${rolloff} for ${soundName}, using -12`)
            rolloff = -12
          }

          const filter = new Tone.Filter({
            frequency: synthParams.filter.frequency,
            type: synthParams.filter.type,
            Q: filterQ,
            rolloff: rolloff,
          }).connect(audioEngine.getDestination())
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
      } else if (synthParams.synthType === 'Dual') {
        // For cowbell - dual synth setup
        const synth1 = new Tone.Synth(synthParams.synth1.config).connect(
          audioEngine.getDestination()
        )
        const synth2 = new Tone.Synth(synthParams.synth2.config).connect(
          audioEngine.getDestination()
        )

        synth1.volume.value = Tone.gainToDb(volume)
        synth2.volume.value = Tone.gainToDb(volume)

        // Fix Q parameters for filters
        const filter1Q =
          synthParams.synth1.filter.Q && synthParams.synth1.filter.Q > 0
            ? synthParams.synth1.filter.Q
            : 1
        const filter2Q =
          synthParams.synth2.filter.Q && synthParams.synth2.filter.Q > 0
            ? synthParams.synth2.filter.Q
            : 1

        // Fix rolloff parameters
        let filter1Rolloff = synthParams.synth1.filter.rolloff || -12
        if (![-12, -24, -48, -96].includes(filter1Rolloff)) {
          console.warn(`Invalid rolloff ${filter1Rolloff} for ${soundName} synth1, using -12`)
          filter1Rolloff = -12
        }

        let filter2Rolloff = synthParams.synth2.filter.rolloff || -12
        if (![-12, -24, -48, -96].includes(filter2Rolloff)) {
          console.warn(`Invalid rolloff ${filter2Rolloff} for ${soundName} synth2, using -12`)
          filter2Rolloff = -12
        }

        const filter1 = new Tone.Filter({
          frequency: synthParams.synth1.filter.frequency,
          type: synthParams.synth1.filter.type,
          Q: filter1Q,
          rolloff: filter1Rolloff,
        }).connect(audioEngine.getDestination())

        const filter2 = new Tone.Filter({
          frequency: synthParams.synth2.filter.frequency,
          type: synthParams.synth2.filter.type,
          Q: filter2Q,
          rolloff: filter2Rolloff,
        }).connect(audioEngine.getDestination())

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
      console.error(`Error creating synthesis instrument for ${soundName}:`, error)
      console.error('Sound data:', soundData)

      // Try to create a fallback simple synth
      try {
        console.log(`Creating fallback synth for ${soundName}`)
        const fallbackSynth = new Tone.Synth().connect(audioEngine.getDestination())
        fallbackSynth.volume.value = Tone.gainToDb(volume)
        fallbackSynth.triggerAttackRelease('C4', '8n')
        setTimeout(() => fallbackSynth.dispose(), 1000)
      } catch (fallbackError) {
        console.error('Even fallback synth failed:', fallbackError)
      }
    }
  }

  // New method for scheduled playback with precise timing - fixes Safari timing issues
  async playSoundScheduled(soundName, volume, time, trackSettings = null) {
    if (!this.isInitialized || !this.soundsLoaded) {
      console.warn(`Sound system not ready for ${soundName}`)
      return
    }
    
    // Ensure reverb is initialized if needed
    if (!this.reverbInitialized && trackSettings?.reverb_send > 0) {
      await this.initializeReverb()
    }

    // Find the sound data - check both old and new key formats
    const soundData = this.soundsData.find(
      sound =>
        this.getDrumKey(sound.drum_type, sound.id) === soundName ||
        this.getDrumKey(sound.drum_type) === soundName
    )

    if (!soundData) {
      console.warn(`Sound ${soundName} not found`)
      return
    }

    // Apply gain settings to volume if provided
    let adjustedVolume = volume
    if (trackSettings?.gain_db !== undefined && trackSettings.gain_db !== 0) {
      // Convert dB to linear gain and apply to volume
      const gainMultiplier = Math.pow(10, trackSettings.gain_db / 20)
      adjustedVolume = Math.max(0, Math.min(1, volume * gainMultiplier))
    }

    // Check if we should use a sample or synthesis
    if (soundData.type === 'sample' && soundData.file_path && sampleLoader.hasSample(soundName)) {
      // Play sample with scheduled timing
      this.playSampleScheduled(soundName, adjustedVolume, time, trackSettings)
    } else {
      // Play synthesized sound with scheduled timing
      this.createSynthesisInstrumentScheduled(soundName, adjustedVolume, time, trackSettings)
    }
  }

  playSampleScheduled(soundName, volume, time, trackSettings = null) {
    const player = this.samplePlayers.get(soundName)
    if (!player) {
      console.warn(`Sample player for ${soundName} not found, falling back to synthesis`)
      this.createSynthesisInstrumentScheduled(soundName, volume, time, trackSettings)
      return
    }

    // Apply pitch settings if provided
    if (trackSettings?.pitch_semitones !== undefined && trackSettings.pitch_semitones !== 0) {
      // Convert semitones to playback rate: 2^(semitones/12)
      const pitchRatio = Math.pow(2, trackSettings.pitch_semitones / 12)
      player.playbackRate = pitchRatio
    } else {
      player.playbackRate = 1 // Reset to normal pitch
    }

    // Create effects chain and reverb send
    const effectsToDispose = []
    let dryChain = this.reverbInitialized ? this.dryGain : audioEngine.getDestination()
    let wetChain = this.reverbInitialized ? this.reverbSend : null

    // Apply filter settings if provided
    if (trackSettings?.filter && (trackSettings.filter.cutoff_hz !== 20000 || trackSettings.filter.resonance_q !== 0.7)) {
      const dryFilter = new Tone.Filter({
        frequency: trackSettings.filter.cutoff_hz,
        type: 'lowpass',
        Q: trackSettings.filter.resonance_q
      }).connect(dryChain)
      
      dryChain = dryFilter
      effectsToDispose.push(dryFilter)
      
      if (wetChain) {
        const wetFilter = new Tone.Filter({
          frequency: trackSettings.filter.cutoff_hz,
          type: 'lowpass',
          Q: trackSettings.filter.resonance_q
        }).connect(wetChain)
        
        wetChain = wetFilter
        effectsToDispose.push(wetFilter)
      }
    }

    // Apply reverb send level and connect player
    const reverbSend = trackSettings?.reverb_send || 0
    player.disconnect()
    
    if (this.reverbInitialized && reverbSend > 0 && wetChain) {
      wetChain.gain.setValueAtTime(reverbSend, time - 0.01)
      player.fan(dryChain, wetChain)
    } else {
      player.connect(dryChain)
    }

    // Set volume just before scheduled time to avoid clicks
    player.volume.setValueAtTime(Tone.gainToDb(volume), time - 0.01)
    player.start(time)

    // Clean up effects after sample finishes
    if (effectsToDispose.length > 0) {
      // Estimate sample duration and clean up effects
      setTimeout(() => {
        effectsToDispose.forEach(effect => effect.dispose())
        // Reconnect player to default destination
        player.disconnect()
        player.connect(audioEngine.getDestination())
      }, 5000) // 5 seconds should be enough for most drum samples
    }
  }

  createSynthesisInstrumentScheduled(soundName, volume, time, trackSettings = null) {
    const soundData = this.soundsData.find(
      sound =>
        this.getDrumKey(sound.drum_type, sound.id) === soundName ||
        this.getDrumKey(sound.drum_type) === soundName
    )

    if (!soundData || !soundData.synthesis_params) {
      console.warn(`No synthesis params for ${soundName}`)
      return
    }

    try {
      const synthParams = JSON.parse(soundData.synthesis_params)
      
      // Apply track settings to synthesis parameters
      const adjustedParams = this.applySynthTrackSettings(synthParams, trackSettings)

      if (adjustedParams.synthType === 'MembraneSynth') {
        const synth = new Tone.MembraneSynth(adjustedParams.config)
        synth.volume.value = Tone.gainToDb(volume)
        
        // Connect to dry and wet chains for reverb
        const reverbSend = trackSettings?.reverb_send || 0
        if (this.reverbInitialized && reverbSend > 0) {
          this.reverbSend.gain.setValueAtTime(reverbSend, time - 0.01)
          synth.fan(this.dryGain, this.reverbSend)
        } else {
          synth.connect(this.reverbInitialized ? this.dryGain : audioEngine.getDestination())
        }
        
        // Schedule the attack at the exact time
        synth.triggerAttackRelease(adjustedParams.note, adjustedParams.duration, time)
        setTimeout(() => synth.dispose(), adjustedParams.cleanup_delay)
      } else if (adjustedParams.synthType === 'NoiseSynth') {
        const synth = new Tone.NoiseSynth(adjustedParams.config)
        synth.volume.value = Tone.gainToDb(volume)

        // Connect to dry and wet chains for reverb
        const reverbSend = trackSettings?.reverb_send || 0

        if (adjustedParams.filter) {
          // Fix invalid Q parameter - Q should be positive
          const filterQ =
            adjustedParams.filter.Q && adjustedParams.filter.Q > 0 ? adjustedParams.filter.Q : 1

          // Fix invalid rolloff parameter - must be -12, -24, -48, or -96
          let rolloff = adjustedParams.filter.rolloff || -12
          if (![-12, -24, -48, -96].includes(rolloff)) {
            rolloff = -12
          }

          const filter = new Tone.Filter({
            frequency: adjustedParams.filter.frequency,
            type: adjustedParams.filter.type,
            Q: filterQ,
            rolloff: rolloff,
          })
          
          synth.connect(filter)
          if (this.reverbInitialized && reverbSend > 0) {
            this.reverbSend.gain.setValueAtTime(reverbSend, time - 0.01)
            filter.fan(this.dryGain, this.reverbSend)
          } else {
            filter.connect(this.reverbInitialized ? this.dryGain : audioEngine.getDestination())
          }

          // Schedule the attack at the exact time
          synth.triggerAttackRelease(adjustedParams.duration, time)

          setTimeout(() => {
            synth.dispose()
            filter.dispose()
          }, adjustedParams.cleanup_delay)
        } else {
          if (this.reverbInitialized && reverbSend > 0) {
            this.reverbSend.gain.setValueAtTime(reverbSend, time - 0.01)
            synth.fan(this.dryGain, this.reverbSend)
          } else {
            synth.connect(this.reverbInitialized ? this.dryGain : audioEngine.getDestination())
          }
          
          if (adjustedParams.multiple_hits) {
            // For clap - multiple hits, all scheduled relative to the base time
            adjustedParams.multiple_hits.forEach(delay => {
              synth.triggerAttackRelease(adjustedParams.duration, time + delay)
            })
          } else {
            // Schedule the attack at the exact time
            synth.triggerAttackRelease(adjustedParams.duration, time)
          }

          setTimeout(() => synth.dispose(), adjustedParams.cleanup_delay)
        }
      } else if (adjustedParams.synthType === 'Dual') {
        // For cowbell - dual synth setup
        const synth1 = new Tone.Synth(adjustedParams.synth1.config)
        const synth2 = new Tone.Synth(adjustedParams.synth2.config)

        synth1.volume.value = Tone.gainToDb(volume)
        synth2.volume.value = Tone.gainToDb(volume)

        // Connect to dry and wet chains for reverb
        const reverbSend = trackSettings?.reverb_send || 0

        // Fix Q parameters for filters
        const filter1Q =
          adjustedParams.synth1.filter.Q && adjustedParams.synth1.filter.Q > 0
            ? adjustedParams.synth1.filter.Q
            : 1
        const filter2Q =
          adjustedParams.synth2.filter.Q && adjustedParams.synth2.filter.Q > 0
            ? adjustedParams.synth2.filter.Q
            : 1

        // Fix rolloff parameters
        let filter1Rolloff = adjustedParams.synth1.filter.rolloff || -12
        if (![-12, -24, -48, -96].includes(filter1Rolloff)) {
          filter1Rolloff = -12
        }

        let filter2Rolloff = adjustedParams.synth2.filter.rolloff || -12
        if (![-12, -24, -48, -96].includes(filter2Rolloff)) {
          filter2Rolloff = -12
        }

        const filter1 = new Tone.Filter({
          frequency: adjustedParams.synth1.filter.frequency,
          type: adjustedParams.synth1.filter.type,
          Q: filter1Q,
          rolloff: filter1Rolloff,
        })

        const filter2 = new Tone.Filter({
          frequency: adjustedParams.synth2.filter.frequency,
          type: adjustedParams.synth2.filter.type,
          Q: filter2Q,
          rolloff: filter2Rolloff,
        })

        synth1.connect(filter1)
        synth2.connect(filter2)
        
        if (this.reverbInitialized && reverbSend > 0) {
          this.reverbSend.gain.setValueAtTime(reverbSend, time - 0.01)
          filter1.fan(this.dryGain, this.reverbSend)
          filter2.fan(this.dryGain, this.reverbSend)
        } else {
          filter1.connect(this.reverbInitialized ? this.dryGain : audioEngine.getDestination())
          filter2.connect(this.reverbInitialized ? this.dryGain : audioEngine.getDestination())
        }

        // Schedule both synths at the exact time
        synth1.triggerAttackRelease(adjustedParams.synth1.note, adjustedParams.duration, time)
        synth2.triggerAttackRelease(adjustedParams.synth2.note, adjustedParams.duration, time)

        setTimeout(() => {
          synth1.dispose()
          synth2.dispose()
          filter1.dispose()
          filter2.dispose()
        }, adjustedParams.cleanup_delay)
      }
    } catch (error) {
      console.error(`Error creating synthesis instrument for ${soundName}:`, error)

      // Try to create a fallback simple synth with scheduled timing
      try {
        const fallbackSynth = new Tone.Synth().connect(audioEngine.getDestination())
        fallbackSynth.volume.value = Tone.gainToDb(volume)
        fallbackSynth.triggerAttackRelease('C4', '8n', time)
        setTimeout(() => fallbackSynth.dispose(), 1000)
      } catch (fallbackError) {
        console.error('Even fallback synth failed:', fallbackError)
      }
    }
  }

  // Helper method to apply track settings to synthesis parameters
  applySynthTrackSettings(synthParams, trackSettings) {
    if (!trackSettings) return synthParams

    // Create a deep copy of the synthesis parameters
    const adjustedParams = JSON.parse(JSON.stringify(synthParams))

    // Apply pitch settings to note frequencies
    if (trackSettings.pitch_semitones !== undefined && trackSettings.pitch_semitones !== 0) {
      const pitchRatio = Math.pow(2, trackSettings.pitch_semitones / 12)
      
      if (adjustedParams.note) {
        // For single note synthesis, adjust the frequency
        const noteFreq = Tone.Frequency(adjustedParams.note).toFrequency()
        adjustedParams.note = noteFreq * pitchRatio
      }
      
      if (adjustedParams.synth1?.note) {
        const noteFreq1 = Tone.Frequency(adjustedParams.synth1.note).toFrequency()
        adjustedParams.synth1.note = noteFreq1 * pitchRatio
      }
      
      if (adjustedParams.synth2?.note) {
        const noteFreq2 = Tone.Frequency(adjustedParams.synth2.note).toFrequency()
        adjustedParams.synth2.note = noteFreq2 * pitchRatio
      }
    }

    // Apply filter settings to existing filters or add new ones
    if (trackSettings.filter && (trackSettings.filter.cutoff_hz !== 20000 || trackSettings.filter.resonance_q !== 0.7)) {
      // For synthesis with existing filters, modify the filter parameters
      if (adjustedParams.filter) {
        adjustedParams.filter.frequency = trackSettings.filter.cutoff_hz
        adjustedParams.filter.Q = trackSettings.filter.resonance_q
      }
      
      if (adjustedParams.synth1?.filter) {
        adjustedParams.synth1.filter.frequency = trackSettings.filter.cutoff_hz
        adjustedParams.synth1.filter.Q = trackSettings.filter.resonance_q
      }
      
      if (adjustedParams.synth2?.filter) {
        adjustedParams.synth2.filter.frequency = trackSettings.filter.cutoff_hz
        adjustedParams.synth2.filter.Q = trackSettings.filter.resonance_q
      }
    }

    return adjustedParams
  }
}

export const drumSoundsInstance = new DrumSoundsAPI()

// Dynamic sound names that updates after initialization
export function getSoundNames() {
  return drumSoundsInstance.getSoundNames()
}

// Legacy compatibility - will be empty initially but populated after initialization
export const soundNames = drumSoundsInstance.getSoundNames()
