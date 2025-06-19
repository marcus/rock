import * as Tone from 'tone'

export class LFONode {
  constructor(options = {}) {
    this.name = 'LFONode'

    // LFO system components
    this.lfo = null
    this.targetParam = null
    this.isInitialized = false

    // Handle both flat and nested 'lfo' structures
    const lfoOpts = options.lfo || {}

    // Default options
    this.options = {
      frequency: lfoOpts.frequency ?? options.frequency ?? 2.0, // Hz
      depth: lfoOpts.depth ?? options.depth ?? 1.0, // 0-1 or param-specific
      min: lfoOpts.min ?? options.min ?? 0.0, // lower bound of modulation
      max: lfoOpts.max ?? options.max ?? 1.0, // upper bound
      type: lfoOpts.type ?? options.type ?? 'sine', // sine, triangle, square, sawtooth
      autoStart: lfoOpts.autoStart ?? options.autoStart ?? true,
      ...options,
    }
  }

  async initialize() {
    if (this.isInitialized) return

    try {
      await Tone.start()

      this.lfo = new Tone.LFO({
        frequency: this.options.frequency,
        min: this.options.min,
        max: this.options.max,
        type: this.options.type,
      })

      if (this.options.autoStart) {
        this.lfo.start()
      }

      this.isInitialized = true
    } catch (error) {
      console.error('Failed to initialize LFONode:', error)
    }
  }

  get frequency() {
    return this.lfo ? this.lfo.frequency.value : this.options.frequency
  }

  set frequency(value) {
    this.options.frequency = Math.max(0.1, Math.min(20, value))
    if (this.lfo) {
      this.lfo.frequency.rampTo(this.options.frequency, 0.02)
    }
  }

  get depth() {
    return this.options.depth
  }

  set depth(value) {
    this.options.depth = Math.max(0, Math.min(1, value))
    // Depth is handled by min/max range, so we need to update the range
    this.updateRange()
  }

  get min() {
    return this.lfo ? this.lfo.min : this.options.min
  }

  set min(value) {
    this.options.min = value
    if (this.lfo) {
      this.lfo.min = value
    }
  }

  get max() {
    return this.lfo ? this.lfo.max : this.options.max
  }

  set max(value) {
    this.options.max = value
    if (this.lfo) {
      this.lfo.max = value
    }
  }

  get type() {
    return this.lfo ? this.lfo.type : this.options.type
  }

  set type(value) {
    this.options.type = value
    if (this.lfo) {
      this.lfo.type = value
    }
  }

  updateRange() {
    // For most parameters, we want to modulate around a center point
    // Volume should modulate around 0dB (1.0 in linear), frequency around base freq, etc.
    if (this.lfo) {
      const depthAmount = this.options.depth
      // Use a range that makes sense for the parameter being modulated
      // For volume: -depth to +depth (around 1.0)
      // For frequency: base * (1 - depth) to base * (1 + depth)
      this.lfo.min = -depthAmount
      this.lfo.max = depthAmount
    }
  }

  connectParam(param) {
    if (!this.lfo) {
      console.warn('🚫 LFONode not initialized yet')
      return
    }

    if (this.targetParam) {
      this.lfo.disconnect(this.targetParam)
    }

    this.targetParam = param
    this.lfo.connect(param)
  }

  setFrequency(freqHz) {
    this.frequency = freqHz
  }

  setDepth(min, max) {
    this.min = min
    this.max = max
  }

  setType(type) {
    this.type = type
  }

  start() {
    if (this.lfo && this.lfo.state !== 'started') {
      this.lfo.start()
    }
  }

  stop() {
    if (this.lfo && this.lfo.state === 'started') {
      this.lfo.stop()
    }
  }

  dispose() {
    if (this.lfo) {
      this.lfo.dispose()
      this.lfo = null
    }
    this.targetParam = null
    this.isInitialized = false
  }

  static getDefaults() {
    return {
      frequency: 2.0,
      depth: 1.0,
      min: 0.0,
      max: 1.0,
      type: 'sine',
      autoStart: true,
    }
  }
}