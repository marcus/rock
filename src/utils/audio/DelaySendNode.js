import * as Tone from 'tone'

export class DelaySendNode {
  constructor(options = {}) {
    this.name = 'DelaySendNode'

    // Create input and output nodes
    this.input = new Tone.Gain(1)
    this.output = new Tone.Gain(1)

    // Delay system components
    this.delay = null
    this.delaySend = null
    this.feedbackGain = null
    this.dryGain = null
    this.isInitialized = false

    // Handle both flat and nested 'delay_send' structures
    const delayOpts = options.delay_send || {}

    // Default options
    this.options = {
      delayTime: delayOpts.delay_time ?? options.delayTime ?? 0.25,
      feedback: delayOpts.feedback ?? options.feedback ?? 0.3,
      wetLevel: delayOpts.wet_level ?? options.wetLevel ?? 0,
      dryLevel: options.dryLevel || 1, // dryLevel seems to be flat already
      ...options,
    }
  }

  async initialize() {
    if (this.isInitialized) return

    try {
      // Ensure audio context is started
      await Tone.start()

      // Create delay node
      this.delay = new Tone.Delay(this.options.delayTime)

      // Create feedback gain node
      this.feedbackGain = new Tone.Gain(this.options.feedback)

      // Create gain nodes for wet/dry mix
      this.delaySend = new Tone.Gain(this.options.wetLevel)
      this.dryGain = new Tone.Gain(this.options.dryLevel)

      // Connect delay chain
      // Input splits to dry and wet paths
      this.input.connect(this.dryGain)
      this.input.connect(this.delaySend)

      // Wet path goes through delay
      this.delaySend.connect(this.delay)

      // Delay connects to output and feedback
      this.delay.connect(this.output)
      this.delay.connect(this.feedbackGain)

      // Feedback connects back to delay input
      this.feedbackGain.connect(this.delay)

      // Dry path connects to output
      this.dryGain.connect(this.output)

      this.isInitialized = true
    } catch (error) {
      console.error('❌ Failed to initialize DelaySendNode:', error)
    }
  }

  get delayTime() {
    return this.delay ? this.delay.delayTime.value : this.options.delayTime
  }

  set delayTime(value) {
    this.options.delayTime = Math.max(0, Math.min(1, value))
    if (this.delay) {
      this.delay.delayTime.rampTo(this.options.delayTime, 0.02)
    }
  }

  get feedback() {
    return this.feedbackGain ? this.feedbackGain.gain.value : this.options.feedback
  }

  set feedback(value) {
    this.options.feedback = Math.max(0, Math.min(0.95, value))
    if (this.feedbackGain) {
      this.feedbackGain.gain.rampTo(this.options.feedback, 0.02)
    }
  }

  get wetLevel() {
    return this.delaySend ? this.delaySend.gain.value : this.options.wetLevel
  }

  set wetLevel(value) {
    this.options.wetLevel = Math.max(0, Math.min(1, value))
    if (this.delaySend) {
      this.delaySend.gain.rampTo(this.options.wetLevel, 0.02)
    }
  }

  get dryLevel() {
    return this.dryGain ? this.dryGain.gain.value : this.options.dryLevel
  }

  set dryLevel(value) {
    this.options.dryLevel = Math.max(0, Math.min(1, value))
    if (this.dryGain) {
      this.dryGain.gain.rampTo(this.options.dryLevel, 0.02)
    }
  }

  // Set delay time at a specific time (for precise scheduling)
  setDelayTimeAtTime(value, time) {
    this.options.delayTime = Math.max(0, Math.min(1, value))
    if (this.delay) {
      this.delay.delayTime.setValueAtTime(this.options.delayTime, time)
    }
  }

  // Set feedback level at a specific time (for precise scheduling)
  setFeedbackAtTime(value, time) {
    this.options.feedback = Math.max(0, Math.min(0.95, value))
    if (this.feedbackGain) {
      this.feedbackGain.gain.setValueAtTime(this.options.feedback, time)
    }
  }

  // Set wet level at a specific time (for precise scheduling)
  setWetLevelAtTime(value, time) {
    this.options.wetLevel = Math.max(0, Math.min(1, value))
    if (this.delaySend) {
      this.delaySend.gain.setValueAtTime(this.options.wetLevel, time)
    }
  }

  // Get the wet send node for direct connection (for advanced routing)
  getWetSend() {
    return this.delaySend
  }

  // Get the dry gain node for direct connection (for advanced routing)
  getDryGain() {
    return this.dryGain
  }

  dispose() {
    if (this.delay) {
      this.delay.dispose()
      this.delay = null
    }
    if (this.feedbackGain) {
      this.feedbackGain.dispose()
      this.feedbackGain = null
    }
    if (this.delaySend) {
      this.delaySend.dispose()
      this.delaySend = null
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
      delayTime: 0.25,
      feedback: 0.3,
      wetLevel: 0,
      dryLevel: 1,
    }
  }
}