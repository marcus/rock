import * as Tone from 'tone'

class AudioEngine {
  constructor() {
    this.isInitialized = false
    this.masterVolume = new Tone.Volume(-6).toDestination()
  }

  async initialize() {
    if (this.isInitialized) return

    await Tone.start()
    this.isInitialized = true
    console.log('Audio engine initialized')
  }

  async ensureInitialized() {
    if (!this.isInitialized) {
      await this.initialize()
    }
  }

  setMasterVolume(volume) {
    // volume should be between 0 and 1
    const dbValue = Tone.gainToDb(volume)
    this.masterVolume.volume.value = dbValue
  }

  getMasterVolume() {
    return Tone.dbToGain(this.masterVolume.volume.value)
  }

  getDestination() {
    return this.masterVolume
  }

  dispose() {
    this.masterVolume.dispose()
    this.isInitialized = false
  }
}

// Singleton instance
export const audioEngine = new AudioEngine()
