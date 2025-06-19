import * as Tone from 'tone'

export class DelaySendNode {
  constructor(options = {}) {
    this.name = 'DelaySendNode'

    this.input = new Tone.Gain(1)
    this.output = new Tone.Gain(1)

    this.delaySend = null
    this.dryGain = null
    this.delay = null
    this.feedbackGain = null
    this.isInitialized = false

    this.options = {
      delayTime: options.delayTime || 0.25,     // seconds
      feedback: options.feedback || 0.3,        // 0–1
      wetLevel: options.wetLevel || 0,          // 0–1
      dryLevel: options.dryLevel || 1,          // 0–1
      ...options
    }
  }

  async initialize() {
    if (this.isInitialized) return
    try {
      await Tone.start()

      this.delay = new Tone.FeedbackDelay({
        delayTime: this.options.delayTime,
        feedback: this.options.feedback,
        wet: this.options.wetLevel,
      })

      this.delaySend = new Tone.Gain(this.options.wetLevel)
      this.dryGain = new Tone.Gain(this.options.dryLevel)

      this.input.connect(this.dryGain)
      this.input.connect(this.delaySend)

      this.delaySend.connect(this.delay)
      this.delay.connect(this.output)

      this.dryGain.connect(this.output)

      this.isInitialized = true
      console.log('DelaySendNode initialized')
    } catch (error) {
      console.error('Failed to initialize DelaySendNode:', error)
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

  setDelayTime(seconds) {
    this.options.delayTime = seconds
    if (this.delay) {
      this.delay.delayTime.setValueAtTime(seconds, Tone.now())
    }
  }

  setFeedback(value) {
    this.options.feedback = Math.max(0, Math.min(0.95, value))
    if (this.delay) {
      this.delay.feedback.setValueAtTime(this.options.feedback, Tone.now())
    }
  }

  connect(destination) {
    this.output.connect(destination)
    return this
  }

  getWetSend() {
    return this.delaySend
  }

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

  static getDefaults() {
    return {
      delayTime: 0.25,
      feedback: 0.3,
      wetLevel: 0,
      dryLevel: 1,
    }
  }
}