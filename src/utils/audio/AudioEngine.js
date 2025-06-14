import * as Tone from 'tone'

class AudioEngine {
  constructor() {
    this.isInitialized = false
    this.masterVolume = new Tone.Volume(-6).toDestination()
    this.masterMuted = false
    this.volumeBeforeMute = 1.0 // Store the volume before muting
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
    if (!this.masterMuted) {
      const dbValue = Tone.gainToDb(volume)
      this.masterVolume.volume.value = dbValue
    }
    // Always store the volume even when muted so we can restore it
    this.volumeBeforeMute = volume
  }

  getMasterVolume() {
    if (this.masterMuted) {
      return this.volumeBeforeMute
    }
    return Tone.dbToGain(this.masterVolume.volume.value)
  }

  setMasterMute(muted) {
    this.masterMuted = muted
    if (muted) {
      // Store current volume and mute
      this.volumeBeforeMute = Tone.dbToGain(this.masterVolume.volume.value)
      this.masterVolume.volume.value = Tone.gainToDb(0.0001) // Very quiet instead of true 0 to avoid issues
    } else {
      // Restore previous volume
      const dbValue = Tone.gainToDb(this.volumeBeforeMute)
      this.masterVolume.volume.value = dbValue
    }
  }

  getMasterMute() {
    return this.masterMuted
  }

  toggleMasterMute() {
    this.setMasterMute(!this.masterMuted)
    return this.masterMuted
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
