import * as Tone from 'tone'

export class SampleLoader {
  constructor() {
    this.samples = new Map()
    this.loadPromises = new Map()
  }

  async loadSample(name, url) {
    if (this.samples.has(name)) {
      return this.samples.get(name)
    }

    if (this.loadPromises.has(name)) {
      return this.loadPromises.get(name)
    }

    const loadPromise = new Promise((resolve, reject) => {
      const player = new Tone.Player({
        url,
        onload: () => {
          this.samples.set(name, player)
          resolve(player)
        },
        onerror: (error) => {
          console.warn(`Failed to load sample ${name} from ${url}:`, error)
          reject(error)
        }
      })
    })

    this.loadPromises.set(name, loadPromise)
    return loadPromise
  }

  async loadSamples(sampleMap) {
    const promises = Object.entries(sampleMap).map(([name, url]) => 
      this.loadSample(name, url).catch(error => {
        console.warn(`Skipping sample ${name}:`, error)
        return null
      })
    )
    
    await Promise.allSettled(promises)
  }

  getSample(name) {
    return this.samples.get(name)
  }

  hasSample(name) {
    return this.samples.has(name)
  }

  dispose() {
    this.samples.forEach(player => player.dispose())
    this.samples.clear()
    this.loadPromises.clear()
  }
}

export const sampleLoader = new SampleLoader()