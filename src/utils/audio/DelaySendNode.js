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
    this.feedback = null
    this.dryGain = null
    this.isInitialized = false

    // Default options
    this.options = {
      delayTime: options.delayTime || 0.25, // seconds
      feedback: options.feedback || 0.3, // 0-0.95
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

      // Create delay node
      this.delay = new Tone.Delay(this.options.delayTime)

      // Create feedback gain node
      this.feedback = new Tone.Gain(this.options.feedback)

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
      this.delay.connect(this.feedback)

      // Feedback connects back to delay input
      this.feedback.connect(this.delay)

      // Dry path connects to output
      this.dryGain.connect(this.output)

      this.isInitialized = true
      console.log(
        'DelaySendNode initialized with delay time:',
        this.options.delayTime,
        'feedback:',
        this.options.feedback
      )
    } catch (error) {
      console.error('Failed to initialize DelaySendNode:', error)
    }
  }

  get delayTime() {
    return this.delay ? this.delay.delayTime.value : this.options.delayTime
  }

  set delayTime(value) {
    this.options.delayTime = Math.max(0, Math.min(1, value))
    if (this.delay) {
      this.delay.delayTime.setValueAtTime(this.options.delayTime, Tone.now())
    }
  }

  get feedbackLevel() {
    return this.feedback ? this.feedback.gain.value : this.options.feedback
  }

  set feedbackLevel(value) {
    this.options.feedback = Math.max(0, Math.min(0.95, value))
    if (this.feedback) {
      this.feedback.gain.setValueAtTime(this.options.feedback, Tone.now())
    }
  }

  get wetLevel() {
    return this.delaySend ? this.delaySend.gain.value : this.options.wetLevel
  }

  set wetLevel(value) {
    this.options.wetLevel = Math.max(0, Math.min(1, value))
    if (this.delaySend) {
      this.delaySend.gain.setValueAtTime(this.options.wetLevel, Tone.now())
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

  // Set delay time at a specific time (for precise scheduling)
  setDelayTimeAtTime(value, time) {
    this.options.delayTime = Math.max(0, Math.min(1, value))
    if (this.delay) {
      this.delay.delayTime.setValueAtTime(this.options.delayTime, time)
    }
  }

  // Set feedback level at a specific time (for precise scheduling)
  setFeedbackLevelAtTime(value, time) {
    this.options.feedback = Math.max(0, Math.min(0.95, value))
    if (this.feedback) {
      this.feedback.gain.setValueAtTime(this.options.feedback, time)
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
    if (this.feedback) {
      this.feedback.dispose()
      this.feedback = null
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