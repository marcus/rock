export function initAudio() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext
  const audioContext = new AudioContextClass()
  const masterGain = audioContext.createGain()
  masterGain.connect(audioContext.destination)
  masterGain.gain.value = 0.8
  
  return { audioContext, masterGain }
}

export const drumSounds = {
  kick: (audioContext, outputGain) => {
    const osc = audioContext.createOscillator()
    const gain = audioContext.createGain()
    
    osc.frequency.setValueAtTime(60, audioContext.currentTime)
    osc.frequency.exponentialRampToValueAtTime(40, audioContext.currentTime + 0.1)
    
    gain.gain.setValueAtTime(1, audioContext.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)
    
    osc.connect(gain)
    gain.connect(outputGain)
    
    osc.start()
    osc.stop(audioContext.currentTime + 0.3)
  },
  
  snare: (audioContext, outputGain) => {
    const noise = audioContext.createBufferSource()
    const noiseBuffer = audioContext.createBuffer(1, audioContext.sampleRate * 0.2, audioContext.sampleRate)
    const data = noiseBuffer.getChannelData(0)
    
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2 - 1
    }
    
    noise.buffer = noiseBuffer
    
    const filter = audioContext.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = 200
    
    const gain = audioContext.createGain()
    gain.gain.setValueAtTime(0.8, audioContext.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2)
    
    noise.connect(filter)
    filter.connect(gain)
    gain.connect(outputGain)
    
    noise.start()
  },
  
  hatClosed: (audioContext, outputGain) => {
    const noise = audioContext.createBufferSource()
    const noiseBuffer = audioContext.createBuffer(1, audioContext.sampleRate * 0.1, audioContext.sampleRate)
    const data = noiseBuffer.getChannelData(0)
    
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2 - 1
    }
    
    noise.buffer = noiseBuffer
    
    const filter = audioContext.createBiquadFilter()
    filter.type = 'highpass'
    filter.frequency.value = 8000
    
    const gain = audioContext.createGain()
    gain.gain.setValueAtTime(0.5, audioContext.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1)
    
    noise.connect(filter)
    filter.connect(gain)
    gain.connect(outputGain)
    
    noise.start()
  },
  
  hatOpen: (audioContext, outputGain) => {
    const noise = audioContext.createBufferSource()
    const noiseBuffer = audioContext.createBuffer(1, audioContext.sampleRate * 0.4, audioContext.sampleRate)
    const data = noiseBuffer.getChannelData(0)
    
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2 - 1
    }
    
    noise.buffer = noiseBuffer
    
    const filter = audioContext.createBiquadFilter()
    filter.type = 'highpass'
    filter.frequency.value = 6000
    
    const gain = audioContext.createGain()
    gain.gain.setValueAtTime(0.4, audioContext.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4)
    
    noise.connect(filter)
    filter.connect(gain)
    gain.connect(outputGain)
    
    noise.start()
  },
  
  crash: (audioContext, outputGain) => {
    const noise = audioContext.createBufferSource()
    const noiseBuffer = audioContext.createBuffer(1, audioContext.sampleRate * 1.5, audioContext.sampleRate)
    const data = noiseBuffer.getChannelData(0)
    
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2 - 1
    }
    
    noise.buffer = noiseBuffer
    
    const filter = audioContext.createBiquadFilter()
    filter.type = 'highpass'
    filter.frequency.value = 3000
    filter.Q.value = 0.5
    
    const gain = audioContext.createGain()
    gain.gain.setValueAtTime(0.7, audioContext.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1.5)
    
    noise.connect(filter)
    filter.connect(gain)
    gain.connect(outputGain)
    
    noise.start()
  },
  
  clap: (audioContext, outputGain) => {
    const burstCount = 3
    const burstGap = 0.01
    
    for (let i = 0; i < burstCount; i++) {
      const noise = audioContext.createBufferSource()
      const noiseBuffer = audioContext.createBuffer(1, audioContext.sampleRate * 0.03, audioContext.sampleRate)
      const data = noiseBuffer.getChannelData(0)
      
      for (let j = 0; j < data.length; j++) {
        data[j] = Math.random() * 2 - 1
      }
      
      noise.buffer = noiseBuffer
      
      const filter = audioContext.createBiquadFilter()
      filter.type = 'bandpass'
      filter.frequency.value = 1100
      filter.Q.value = 5
      
      const gain = audioContext.createGain()
      gain.gain.value = 0.5
      
      noise.connect(filter)
      filter.connect(gain)
      gain.connect(outputGain)
      
      noise.start(audioContext.currentTime + i * burstGap)
    }
  },
  
  cowbell: (audioContext, outputGain) => {
    const osc1 = audioContext.createOscillator()
    const osc2 = audioContext.createOscillator()
    const gain = audioContext.createGain()
    
    osc1.frequency.value = 800
    osc2.frequency.value = 1600
    
    gain.gain.setValueAtTime(0.4, audioContext.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2)
    
    osc1.connect(gain)
    osc2.connect(gain)
    gain.connect(outputGain)
    
    osc1.start()
    osc2.start()
    osc1.stop(audioContext.currentTime + 0.2)
    osc2.stop(audioContext.currentTime + 0.2)
  },
  
  tom: (audioContext, outputGain) => {
    const osc = audioContext.createOscillator()
    const gain = audioContext.createGain()
    
    osc.frequency.setValueAtTime(120, audioContext.currentTime)
    osc.frequency.exponentialRampToValueAtTime(80, audioContext.currentTime + 0.2)
    
    gain.gain.setValueAtTime(0.7, audioContext.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4)
    
    osc.connect(gain)
    gain.connect(outputGain)
    
    osc.start()
    osc.stop(audioContext.currentTime + 0.4)
  }
}

export const soundNames = ['kick', 'snare', 'hatClosed', 'hatOpen', 'crash', 'clap', 'cowbell', 'tom']