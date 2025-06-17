import * as Tone from 'tone'

export class BitcrushNode {
  constructor(options = {}) {
    this.name = 'BitcrushNode'

    // Create input and output nodes
    this.input = new Tone.Gain(1)
    this.output = new Tone.Gain(1)

    // Default values
    this._sampleRate = options.sampleRate || 44100
    this._bitDepth = options.bitDepth || 16

    // Create a waveshaper for the bitcrush effect
    this._waveshaper = new Tone.WaveShaper()
    this._updateWaveshaper()

    // Connect the signal chain
    this.input.connect(this._waveshaper)
    this._waveshaper.connect(this.output)
  }

  _updateWaveshaper() {
    const length = 65536 // Larger lookup table for better resolution
    const curve = new Float32Array(length)

    // Calculate quantization levels based on bit depth
    const levels = Math.pow(2, this._bitDepth) - 1
    const stepSize = 2 / levels // Step size for quantization

    for (let i = 0; i < length; i++) {
      const x = (i / (length - 1)) * 2 - 1 // Map i to -1 to 1

      // Bit depth reduction - aggressive quantization
      let quantized = Math.round(x / stepSize) * stepSize

      // Add some aliasing effect for sample rate reduction
      if (this._sampleRate < 44100) {
        const aliasAmount = 1 - this._sampleRate / 44100
        // Create harsh aliasing by introducing higher harmonics
        quantized += Math.sin(x * Math.PI * 8) * aliasAmount * 0.1
        quantized += Math.sin(x * Math.PI * 16) * aliasAmount * 0.05
      }

      // Clamp output to prevent clipping
      curve[i] = Math.max(-1, Math.min(1, quantized))
    }

    this._waveshaper.curve = curve
    this._waveshaper.oversample = 'none' // Disable oversampling for more aliasing
  }

  get sampleRate() {
    return this._sampleRate
  }

  set sampleRate(value) {
    this._sampleRate = Math.max(1000, Math.min(44100, value))
    this._updateWaveshaper()
  }

  get bitDepth() {
    return this._bitDepth
  }

  set bitDepth(value) {
    this._bitDepth = Math.max(1, Math.min(16, value))
    this._updateWaveshaper()
  }

  dispose() {
    if (this._waveshaper) {
      this._waveshaper.dispose()
    }
    this.input.dispose()
    this.output.dispose()
  }

  connect(destination) {
    // Connect the output node to the destination
    this.output.connect(destination)

    // Return the instance itself to allow for proper chaining
    return this
  }

  static getDefaults() {
    return {
      sampleRate: 44100,
      bitDepth: 16,
    }
  }
}
