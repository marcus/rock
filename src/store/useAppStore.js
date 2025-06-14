import { create } from 'zustand'
import { drumSoundsInstance } from '../utils/audio/DrumSoundsAPI'

const useAppStore = create((set, get) => ({
  // Track management state
  tracks: [],
  pattern: {
    steps: [],
    tempo: 120,
    volumes: [],
    muted: []
  },
  
  // Playback state
  isPlaying: false,
  currentStep: 0,
  tempo: 120,
  masterVolume: 80,
  masterMuted: false,
  
  // Actions for track management
  setTracks: (tracks) => set({ tracks }),
  
  addTrack: async (soundData) => {
    const { tracks, pattern } = get()
    if (tracks.length >= 40) return false
    
    // Add sound to DrumSoundsAPI
    const success = await drumSoundsInstance.addSound(soundData)
    if (!success) return false
    
    const newTracks = [...tracks, soundData]
    
    set({
      tracks: newTracks,
      pattern: {
        ...pattern,
        steps: [...pattern.steps, Array(16).fill(false)],
        volumes: [...pattern.volumes, 0.8],
        muted: [...pattern.muted, false]
      }
    })
    
    return true
  },
  
  removeTrack: (trackIndex) => {
    const { tracks, pattern } = get()
    if (tracks.length <= 1) return // Keep at least one track
    
    const trackToRemove = tracks[trackIndex]
    const newTracks = tracks.filter((_, index) => index !== trackIndex)
    
    // Remove the sound from DrumSoundsAPI
    if (trackToRemove) {
      drumSoundsInstance.removeSound(trackToRemove)
    }
    
    set({
      tracks: newTracks,
      pattern: {
        ...pattern,
        steps: pattern.steps.filter((_, index) => index !== trackIndex),
        volumes: pattern.volumes.filter((_, index) => index !== trackIndex),
        muted: pattern.muted.filter((_, index) => index !== trackIndex)
      }
    })
  },
  
  // Actions for pattern management
  setPattern: (pattern) => set({ pattern }),
  
  toggleStep: (row, col) => {
    const { pattern } = get()
    const newPattern = { ...pattern }
    newPattern.steps = pattern.steps.map((stepRow, rowIndex) => 
      rowIndex === row 
        ? stepRow.map((step, colIndex) => colIndex === col ? !step : step)
        : [...stepRow]
    )
    set({ pattern: newPattern })
  },
  
  clearPattern: () => {
    const { pattern } = get()
    set({
      pattern: {
        ...pattern,
        steps: pattern.steps.map(() => Array(16).fill(false))
      }
    })
  },
  
  updateTrackVolume: (track, volume) => {
    const { pattern } = get()
    set({
      pattern: {
        ...pattern,
        volumes: pattern.volumes.map((vol, index) => 
          index === track ? volume / 100 : vol
        )
      }
    })
  },
  
  toggleMute: (track) => {
    const { pattern } = get()
    set({
      pattern: {
        ...pattern,
        muted: pattern.muted.map((muted, index) => 
          index === track ? !muted : muted
        )
      }
    })
  },
  
  // Actions for playback control
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setCurrentStep: (currentStep) => set({ currentStep }),
  
  updateTempo: (newTempo) => {
    const { pattern } = get()
    set({ 
      tempo: newTempo,
      pattern: { ...pattern, tempo: newTempo }
    })
  },
  
  // Actions for master audio controls
  updateMasterVolume: (volume) => set({ masterVolume: volume }),
  toggleMasterMute: () => {
    const { masterMuted } = get()
    set({ masterMuted: !masterMuted })
  },
  
  // Initialize app with default tracks
  initializeApp: async () => {
    // Initialize drum sounds API early
    await drumSoundsInstance.initialize()
    
    // Get default sounds and create initial tracks
    const defaultSounds = drumSoundsInstance.getAllSounds()
    const initialTracks = defaultSounds.slice(0, 8) // Start with first 8 sounds
    
    // Set up default pattern for initial tracks
    const defaultPattern = {
      steps: initialTracks.map(() => Array(16).fill(false)),
      tempo: 120,
      volumes: initialTracks.map(() => 0.8),
      muted: initialTracks.map(() => false)
    }
    
    // Add some default beats
    if (defaultPattern.steps.length > 0) {
      defaultPattern.steps[0] = [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false]
    }
    if (defaultPattern.steps.length > 1) {
      defaultPattern.steps[1] = [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false]
    }
    if (defaultPattern.steps.length > 2) {
      defaultPattern.steps[2] = [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false]
    }
    
    set({
      tracks: initialTracks,
      pattern: defaultPattern
    })
  }
}))

export default useAppStore 