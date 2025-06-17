import * as Tone from 'tone'

export class ReverbNode {
  constructor(options = {}) {
    this.name = 'ReverbNode'

    // Create input and output nodes
    this.input = new Tone.Gain(1)
    this.output = new Tone.Gain(1)

    // Reverb system components
    this.reverbBuffer = null
    this.convolver = null
    this.reverbSend = null
    this.dryGain = null
    this.isInitialized = false

    // Default options
    this.options = {
      reverbTime: options.reverbTime || 2, // seconds
      wetLevel: options.wetLevel || 0, // 0-1
      dryLevel: options.dryLevel || 1, // 0-1
      ...options,
    }
  }

  async initialize() {
    if (this.isInitialized) return

    try {
      // Ensure audio context is started
      await Tone.start()

      // Create impulse response buffer for reverb using current context sample rate
      const sampleRate = Tone.getContext().sampleRate
      const length = Math.floor(sampleRate * this.options.reverbTime)
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
      this.reverbSend = new Tone.Gain(this.options.wetLevel)
      this.dryGain = new Tone.Gain(this.options.dryLevel)

      // Connect reverb chain
      // Input splits to dry and wet paths
      this.input.connect(this.dryGain)
      this.input.connect(this.reverbSend)

      // Wet path goes through convolver
      this.reverbSend.connect(this.convolver)

      // Both paths merge at output
      this.dryGain.connect(this.output)
      this.convolver.connect(this.output)

      this.isInitialized = true
      console.log(
        'ReverbNode initialized with sample rate:',
        sampleRate,
        'reverb time:',
        this.options.reverbTime
      )
    } catch (error) {
      console.error('Failed to initialize ReverbNode:', error)
    }
  }

  get wetLevel() {
    return this.reverbSend ? this.reverbSend.gain.value : this.options.wetLevel
  }

  set wetLevel(value) {
    this.options.wetLevel = Math.max(0, Math.min(1, value))
    if (this.reverbSend) {
      this.reverbSend.gain.setValueAtTime(this.options.wetLevel, Tone.now())
    }
  }

  get dryLevel() {
    return this.dryGain ? this.dryGain.gain.value : this.options.dryLevel
  }

  set dryLevel(value) {
    this.options.dryLevel = Math.max(0, Math.min(1, value))
    if (this.dryGain) {
      this.dryGain.gain.setValueAtTime(this.options.dryLevel, Tone.now())
    }
  }

  // Set wet level at a specific time (for precise scheduling)
  setWetLevelAtTime(value, time) {
    this.options.wetLevel = Math.max(0, Math.min(1, value))
    if (this.reverbSend) {
      this.reverbSend.gain.setValueAtTime(this.options.wetLevel, time)
    }
  }

  // Get the wet send node for direct connection (for advanced routing)
  getWetSend() {
    return this.reverbSend
  }

  // Get the dry gain node for direct connection (for advanced routing)
  getDryGain() {
    return this.dryGain
  }

  dispose() {
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
    if (this.input) {
      this.input.dispose()
    }
    if (this.output) {
      this.output.dispose()
    }
    this.reverbBuffer = null
    this.isInitialized = false
  }

  connect(destination) {
    // Connect the output node to the destination
    this.output.connect(destination)

    // Return the instance itself to allow for proper chaining
    return this
  }

  static getDefaults() {
    return {
      reverbTime: 2,
      wetLevel: 0,
      dryLevel: 1,
    }
  }
}
