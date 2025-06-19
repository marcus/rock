import * as Tone from 'tone'
import { audioEngine } from './AudioEngine.js'
import { sampleLoader } from './SampleLoader.js'
import { BitcrushNode } from './BitcrushNode.js'
import { ReverbNode } from './ReverbNode.js'
import { DelaySendNode } from './DelaySendNode.js'

export class DrumSoundsAPI {
  constructor() {
    this.instruments = new Map() // Now stores actual synth instances, not functions
    this.synthFilters = new Map() // Store filters separately for complex synths
    this.soundsData = []
    this.soundsLoaded = false
    this.isInitialized = false
    // Persistent Tone.Player instances for each loaded sample to avoid Safari scheduling latency
    this.samplePlayers = new Map()
    // Reverb system
    this.reverbNode = new ReverbNode()
    this.reverbInitialized = false
    // Delay system
    this.delayNode = new DelaySendNode()
    this.delayInitialized = false
  }

  async initializeReverb() {
    if (this.reverbInitialized) return

    try {
      await this.reverbNode.initialize()
      this.reverbNode.connect(audioEngine.getDestination())

      this.reverbInitialized = true
      console.log('Reverb system initialized')
    } catch (error) {
      console.error('Failed to initialize reverb:', error)
    }
  }

  async initializeDelay() {
    if (this.delayInitialized) return

    try {
      await this.delayNode.initialize()
      this.delayNode.connect(audioEngine.getDestination())

      this.delayInitialized = true
    } catch (error) {
      console.error('❌ Failed to initialize delay:', error)
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
    // Create persistent synthesis instances for each sound
    this.soundsData.forEach(sound => {
      if (sound.type === 'synthesis' && sound.synthesis_params) {
        const drumKey = this.getDrumKey(sound.drum_type, sound.id)
        const synthParams = JSON.parse(sound.synthesis_params)

        this.createPersistentSynth(drumKey, synthParams)
      }
    })
  }

  createPersistentSynth(drumKey, synthParams) {
    try {
      if (synthParams.synthType === 'MembraneSynth') {
        const synth = new Tone.MembraneSynth(synthParams.config).connect(
          audioEngine.getDestination()
        )
        this.instruments.set(drumKey, {
          synth,
          type: 'MembraneSynth',
          params: synthParams,
        })
      } else if (synthParams.synthType === 'NoiseSynth') {
        const synth = new Tone.NoiseSynth(synthParams.config).connect(audioEngine.getDestination())

        let filter = null
        if (synthParams.filter) {
          // Fix invalid Q parameter - Q should be positive
          const filterQ =
            synthParams.filter.Q && synthParams.filter.Q > 0 ? synthParams.filter.Q : 1

          // Fix invalid rolloff parameter
          let rolloff = synthParams.filter.rolloff || -12
          if (![-12, -24, -48, -96].includes(rolloff)) {
            rolloff = -12
          }

          filter = new Tone.Filter({
            frequency: synthParams.filter.frequency,
            type: synthParams.filter.type,
            Q: filterQ,
            rolloff: rolloff,
          }).connect(audioEngine.getDestination())

          synth.disconnect()
          synth.connect(filter)
        }

        this.instruments.set(drumKey, {
          synth,
          filter,
          type: 'NoiseSynth',
          params: synthParams,
        })
      } else if (synthParams.synthType === 'Dual') {
        const synth1 = new Tone.Synth(synthParams.synth1.config).connect(
          audioEngine.getDestination()
        )
        const synth2 = new Tone.Synth(synthParams.synth2.config).connect(
          audioEngine.getDestination()
        )

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
          filter1Rolloff = -12
        }

        let filter2Rolloff = synthParams.synth2.filter.rolloff || -12
        if (![-12, -24, -48, -96].includes(filter2Rolloff)) {
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

        synth1.disconnect()
        synth2.disconnect()
        synth1.connect(filter1)
        synth2.connect(filter2)

        this.instruments.set(drumKey, {
          synth1,
          synth2,
          filter1,
          filter2,
          type: 'Dual',
          params: synthParams,
        })
      }
    } catch (error) {
      console.error(`Error creating persistent synth for ${drumKey}:`, error)
    }
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
      // Play synthesized sound using persistent synth
      this.playPersistentSynth(soundName, options)
    }
  }

  playSample(soundName, options = {}) {
    const player = this.samplePlayers.get(soundName)
    if (!player) {
      console.warn(`Sample player for ${soundName} not found, falling back to synthesis`)
      this.playPersistentSynth(soundName, options)
      return
    }

    // Apply volume for this hit only
    if (options.volume !== undefined) {
      player.volume.setValueAtTime(Tone.gainToDb(options.volume), Tone.now())
    }

    player.start()
  }

  connectPersistentSynthWithEffects(synthNodes, time, trackSettings, triggerCallback) {
    // synthNodes can be a single synth or an array of synths with filters
    const nodes = Array.isArray(synthNodes) ? synthNodes : [synthNodes]

    // Build effects chain
    const effectsToDispose = []
    
    // Set up delay and reverb routing
    let finalDestination = audioEngine.getDestination()
    
    // If delay is active, route through delay first
    if (this.delayInitialized && trackSettings?.delay_send?.wet_level > 0) {
      finalDestination = this.delayNode.input
    }
    
    let dryChain = this.reverbInitialized
      ? this.reverbNode.getDryGain()
      : finalDestination
    let wetChain = this.reverbInitialized ? this.reverbNode.getWetSend() : null

    // Apply bitcrush if provided
    if (
      trackSettings?.bitcrush &&
      (trackSettings.bitcrush.sample_rate !== 44100 || trackSettings.bitcrush.bit_depth !== 16)
    ) {
      const dryBitcrush = new BitcrushNode({
        sampleRate: trackSettings.bitcrush.sample_rate,
        bitDepth: trackSettings.bitcrush.bit_depth,
      })
      dryBitcrush.connect(dryChain)

      dryChain = dryBitcrush.input // Connect to bitcrush input
      effectsToDispose.push(dryBitcrush)

      if (wetChain) {
        const wetBitcrush = new BitcrushNode({
          sampleRate: trackSettings.bitcrush.sample_rate,
          bitDepth: trackSettings.bitcrush.bit_depth,
        })
        wetBitcrush.connect(wetChain)

        wetChain = wetBitcrush.input // Connect to bitcrush input
        effectsToDispose.push(wetBitcrush)
      }
    }

    // Apply filter settings if provided (additional to built-in filters)
    if (
      trackSettings?.filter &&
      (trackSettings.filter.cutoff_hz !== 20000 || trackSettings.filter.resonance_q !== 0.7)
    ) {
      const dryFilter = new Tone.Filter({
        frequency: trackSettings.filter.cutoff_hz,
        type: 'lowpass',
        Q: trackSettings.filter.resonance_q,
      })
      dryFilter.connect(dryChain)

      dryChain = dryFilter
      effectsToDispose.push(dryFilter)

      if (wetChain) {
        const wetFilter = new Tone.Filter({
          frequency: trackSettings.filter.cutoff_hz,
          type: 'lowpass',
          Q: trackSettings.filter.resonance_q,
        })
        wetFilter.connect(wetChain)

        wetChain = wetFilter
        effectsToDispose.push(wetFilter)
      }
    }

    // Store original connections to restore later
    const originalConnections = []

    try {
      // Disconnect and connect through effects chain
      nodes.forEach(node => {
        if (node && typeof node.disconnect === 'function') {
          node.disconnect()
          originalConnections.push(node)
        }
      })

      // Apply delay settings if active
      if (this.delayInitialized && trackSettings?.delay_send) {
        const { delay_time, feedback, wet_level } = trackSettings.delay_send
        
        if (delay_time !== undefined) {
          this.delayNode.delayTime = delay_time
        }
        if (feedback !== undefined) {
          this.delayNode.feedback = feedback
        }
        if (wet_level !== undefined) {
          this.delayNode.wetLevel = wet_level
        }
      }

      // Connect to dry and wet chains for reverb
      const reverbSend = trackSettings?.reverb_send || 0
      if (this.reverbInitialized && reverbSend > 0 && wetChain) {
        this.reverbNode.setWetLevelAtTime(reverbSend, time - 0.01)
        nodes.forEach(node => {
          if (node && typeof node.fan === 'function') {
            node.fan(dryChain, wetChain)
          } else if (node && typeof node.connect === 'function') {
            node.connect(dryChain)
          }
        })
      } else {
        nodes.forEach(node => {
          if (node && typeof node.connect === 'function') {
            node.connect(dryChain)
          }
        })
      }

      // Execute the trigger callback
      triggerCallback()

      // Clean up effects and restore connections after playing
      if (effectsToDispose.length > 0) {
        setTimeout(() => {
          try {
            effectsToDispose.forEach(effect => {
              if (effect && typeof effect.dispose === 'function') {
                effect.dispose()
              }
            })
            // Reconnect to default destination
            originalConnections.forEach(node => {
              if (
                node &&
                typeof node.disconnect === 'function' &&
                typeof node.connect === 'function'
              ) {
                node.disconnect()
                node.connect(audioEngine.getDestination())
              }
            })
          } catch (cleanupError) {
            console.error('Error during effects cleanup:', cleanupError)
          }
        }, 3000) // 3 seconds should be enough for most synthesis
      }
    } catch (connectionError) {
      console.error('Error in connectPersistentSynthWithEffects:', connectionError)
      // Fallback: try to execute trigger callback anyway
      try {
        triggerCallback()
      } catch (triggerError) {
        console.error('Error in trigger callback:', triggerError)
      }
    }
  }

  playPersistentSynth(soundName, options = {}) {
    const instrumentData = this.instruments.get(soundName)
    if (!instrumentData) {
      console.warn(`Persistent synth ${soundName} not found`)
      return
    }

    const { type, params } = instrumentData

    try {
      if (type === 'MembraneSynth') {
        const { synth } = instrumentData
        if (options.volume !== undefined) {
          synth.volume.value = Tone.gainToDb(options.volume)
        }
        synth.triggerAttackRelease(params.note, params.duration)
      } else if (type === 'NoiseSynth') {
        const { synth } = instrumentData
        if (options.volume !== undefined) {
          synth.volume.value = Tone.gainToDb(options.volume)
        }

        if (params.multiple_hits) {
          // For clap - multiple hits
          params.multiple_hits.forEach(delay => {
            synth.triggerAttackRelease(params.duration, `+${delay}`)
          })
        } else {
          synth.triggerAttackRelease(params.duration)
        }
      } else if (type === 'Dual') {
        const { synth1, synth2 } = instrumentData
        if (options.volume !== undefined) {
          synth1.volume.value = Tone.gainToDb(options.volume)
          synth2.volume.value = Tone.gainToDb(options.volume)
        }
        synth1.triggerAttackRelease(params.synth1.note, params.duration)
        synth2.triggerAttackRelease(params.synth2.note, params.duration)
      }
    } catch (error) {
      console.error(`Error playing persistent synth ${soundName}:`, error)
    }
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
      this.createPersistentSynth(drumKey, synthParams)
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
      const instrumentData = this.instruments.get(drumKey)
      this.disposePersistentSynth(instrumentData)
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

  disposePersistentSynth(instrumentData) {
    try {
      const { type } = instrumentData

      if (type === 'MembraneSynth') {
        instrumentData.synth.dispose()
      } else if (type === 'NoiseSynth') {
        instrumentData.synth.dispose()
        if (instrumentData.filter) {
          instrumentData.filter.dispose()
        }
      } else if (type === 'Dual') {
        instrumentData.synth1.dispose()
        instrumentData.synth2.dispose()
        instrumentData.filter1.dispose()
        instrumentData.filter2.dispose()
      }
    } catch (error) {
      console.error('Error disposing persistent synth:', error)
    }
  }

  dispose() {
    // Dispose persistent synthesis instruments
    this.instruments.forEach(instrumentData => {
      this.disposePersistentSynth(instrumentData)
    })
    this.instruments.clear()

    // Dispose persistent sample players
    this.samplePlayers.forEach(player => player.dispose())
    this.samplePlayers.clear()

    // Dispose reverb system
    if (this.reverbNode) {
      this.reverbNode.dispose()
      this.reverbNode = null
    }
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

    // Ensure delay is initialized if needed
    if (!this.delayInitialized && trackSettings?.delay_send?.wet_level > 0) {
      await this.initializeDelay()
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
    
    // Set up delay and reverb routing for samples
    let finalDestination = audioEngine.getDestination()
    
    // If delay is active, route through delay first
    if (this.delayInitialized && trackSettings?.delay_send?.wet_level > 0) {
      finalDestination = this.delayNode.input
    }
    
    let dryChain = this.reverbInitialized
      ? this.reverbNode.getDryGain()
      : finalDestination
    let wetChain = this.reverbInitialized ? this.reverbNode.getWetSend() : null

    // Apply effects chain if provided

    // Apply bitcrush settings if provided
    if (
      trackSettings?.bitcrush &&
      (trackSettings.bitcrush.sample_rate !== 44100 || trackSettings.bitcrush.bit_depth !== 16)
    ) {
      const dryBitcrush = new BitcrushNode({
        sampleRate: trackSettings.bitcrush.sample_rate,
        bitDepth: trackSettings.bitcrush.bit_depth,
      })
      dryBitcrush.connect(dryChain)

      dryChain = dryBitcrush.input // Connect to bitcrush input
      effectsToDispose.push(dryBitcrush)

      if (wetChain) {
        const wetBitcrush = new BitcrushNode({
          sampleRate: trackSettings.bitcrush.sample_rate,
          bitDepth: trackSettings.bitcrush.bit_depth,
        })
        wetBitcrush.connect(wetChain)

        wetChain = wetBitcrush.input // Connect to bitcrush input
        effectsToDispose.push(wetBitcrush)
      }
    }

    // Apply filter settings if provided
    if (
      trackSettings?.filter &&
      (trackSettings.filter.cutoff_hz !== 20000 || trackSettings.filter.resonance_q !== 0.7)
    ) {
      const dryFilter = new Tone.Filter({
        frequency: trackSettings.filter.cutoff_hz,
        type: 'lowpass',
        Q: trackSettings.filter.resonance_q,
      })
      dryFilter.connect(dryChain)

      dryChain = dryFilter
      effectsToDispose.push(dryFilter)

      if (wetChain) {
        const wetFilter = new Tone.Filter({
          frequency: trackSettings.filter.cutoff_hz,
          type: 'lowpass',
          Q: trackSettings.filter.resonance_q,
        })
        wetFilter.connect(wetChain)

        wetChain = wetFilter
        effectsToDispose.push(wetFilter)
      }
    }

    // Apply delay settings if active
    if (this.delayInitialized && trackSettings?.delay_send) {
      const { delay_time, feedback, wet_level } = trackSettings.delay_send
      
      if (delay_time !== undefined) {
        this.delayNode.delayTime = delay_time
      }
      if (feedback !== undefined) {
        this.delayNode.feedback = feedback
      }
      if (wet_level !== undefined) {
        this.delayNode.wetLevel = wet_level
      }
    }

    // Apply reverb send level and connect player
    const reverbSend = trackSettings?.reverb_send || 0
    player.disconnect()

    try {
      if (this.reverbInitialized && reverbSend > 0 && wetChain) {
        // Set reverb send level on the reverb node
        this.reverbNode.setWetLevelAtTime(reverbSend, time - 0.01)
        player.fan(dryChain, wetChain)
      } else {
        player.connect(dryChain)
      }
    } catch (connectionError) {
      console.error('Error connecting player with effects:', connectionError)
      // Fallback: connect directly to destination
      try {
        player.connect(audioEngine.getDestination())
      } catch (fallbackError) {
        console.error('Fallback connection also failed:', fallbackError)
      }
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
    const instrumentData = this.instruments.get(soundName)
    if (!instrumentData) {
      console.warn(`Persistent synth ${soundName} not found`)
      return
    }

    try {
      // Apply track settings to synthesis parameters
      const adjustedParams = this.applySynthTrackSettings(instrumentData.params, trackSettings)

      if (instrumentData.type === 'MembraneSynth') {
        const { synth } = instrumentData
        synth.volume.value = Tone.gainToDb(volume)

        // Handle effects routing with persistent synth
        this.connectPersistentSynthWithEffects([synth], time, trackSettings, () => {
          // Schedule the attack at the exact time
          synth.triggerAttackRelease(adjustedParams.note, adjustedParams.duration, time)
        })
      } else if (instrumentData.type === 'NoiseSynth') {
        const { synth, filter } = instrumentData
        synth.volume.value = Tone.gainToDb(volume)

        // Determine which nodes to route through effects
        const nodesToRoute = filter ? [filter] : [synth]

        this.connectPersistentSynthWithEffects(nodesToRoute, time, trackSettings, () => {
          if (adjustedParams.multiple_hits) {
            // For clap - multiple hits, all scheduled relative to the base time
            adjustedParams.multiple_hits.forEach(delay => {
              synth.triggerAttackRelease(adjustedParams.duration, time + delay)
            })
          } else {
            // Schedule the attack at the exact time
            synth.triggerAttackRelease(adjustedParams.duration, time)
          }
        })
      } else if (instrumentData.type === 'Dual') {
        const { synth1, synth2, filter1, filter2 } = instrumentData
        synth1.volume.value = Tone.gainToDb(volume)
        synth2.volume.value = Tone.gainToDb(volume)

        // Route both filter outputs through effects
        this.connectPersistentSynthWithEffects([filter1, filter2], time, trackSettings, () => {
          // Schedule both synths at the exact time
          synth1.triggerAttackRelease(adjustedParams.synth1.note, adjustedParams.duration, time)
          synth2.triggerAttackRelease(adjustedParams.synth2.note, adjustedParams.duration, time)
        })
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
    if (
      trackSettings.filter &&
      (trackSettings.filter.cutoff_hz !== 20000 || trackSettings.filter.resonance_q !== 0.7)
    ) {
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
