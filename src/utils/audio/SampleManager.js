import * as Tone from 'tone'
import { audioEngine } from './AudioEngine.js'

export class SampleManager {
  constructor() {
    this.samples = new Map()
    this.loadedFiles = new Map()
  }

  async loadCustomSample(name, file) {
    try {
      await audioEngine.ensureInitialized()

      const arrayBuffer = await file.arrayBuffer()
      const audioBuffer = await Tone.getContext().decodeAudioData(arrayBuffer)

      // Create a Tone.Player for the custom sample
      const player = new Tone.Player(audioBuffer).connect(audioEngine.getDestination())

      this.samples.set(name, player)
      this.loadedFiles.set(name, {
        name: file.name,
        type: 'custom',
        size: file.size,
      })

      return true
    } catch (error) {
      console.error(`Failed to load custom sample ${name}:`, error)
      return false
    }
  }

  async loadCustomSampleFromUrl(name, url) {
    try {
      await audioEngine.ensureInitialized()

      const player = new Tone.Player(url).connect(audioEngine.getDestination())
      await Tone.loaded()

      this.samples.set(name, player)
      this.loadedFiles.set(name, {
        name: url.split('/').pop(),
        type: 'url',
        url,
      })

      return true
    } catch (error) {
      console.error(`Failed to load sample from URL ${name}:`, error)
      return false
    }
  }

  playSample(name, options = {}) {
    const sample = this.samples.get(name)
    if (!sample) {
      console.warn(`Sample ${name} not found`)
      return
    }

    const { volume = 1, playbackRate = 1, startTime = 0 } = options

    if (sample instanceof Tone.Player) {
      sample.volume.value = Tone.gainToDb(volume)
      sample.playbackRate = playbackRate
      sample.start(startTime)
    }
  }

  stopSample(name) {
    const sample = this.samples.get(name)
    if (sample && sample instanceof Tone.Player) {
      sample.stop()
    }
  }

  removeSample(name) {
    const sample = this.samples.get(name)
    if (sample) {
      sample.dispose()
      this.samples.delete(name)
      this.loadedFiles.delete(name)
    }
  }

  getSampleInfo(name) {
    return this.loadedFiles.get(name)
  }

  getAllSamples() {
    return Array.from(this.loadedFiles.keys())
  }

  getAllSampleInfo() {
    return Object.fromEntries(this.loadedFiles)
  }

  dispose() {
    this.samples.forEach(sample => sample.dispose())
    this.samples.clear()
    this.loadedFiles.clear()
  }
}

export const sampleManager = new SampleManager()
