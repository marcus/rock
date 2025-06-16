import { create } from 'zustand'
import { drumSoundsInstance } from '../utils/audio/DrumSoundsAPI'
import { saveAppState, loadAppState } from '../utils/localStorage'

const useAppStore = create((set, get) => ({
  // Track management state
  tracks: [],
  pattern: {
    steps: [],
    tempo: 120,
    volumes: [],
    muted: [],
  },

  // Playback state
  isPlaying: false,
  currentStep: 0,
  tempo: 120,
  masterVolume: 80,
  masterMuted: false,
  
  // Initialization state
  isInitializing: false,
  isInitialized: false,

  // Utility function to save state to localStorage
  saveState: () => {
    const state = get()
    saveAppState(state)
  },

  // Actions for track management
  setTracks: tracks => set({ tracks }),

  addTrack: async soundData => {
    const { tracks, pattern, saveState } = get()
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
        muted: [...pattern.muted, false],
      },
    })

    saveState()
    return true
  },

  removeTrack: trackIndex => {
    const { tracks, pattern, saveState } = get()
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
        muted: pattern.muted.filter((_, index) => index !== trackIndex),
      },
    })

    saveState()
  },

  // Actions for pattern management
  setPattern: pattern => set({ pattern }),

  toggleStep: (row, col) => {
    const { pattern, saveState } = get()
    const newPattern = { ...pattern }
    newPattern.steps = pattern.steps.map((stepRow, rowIndex) =>
      rowIndex === row
        ? stepRow.map((step, colIndex) => (colIndex === col ? !step : step))
        : [...stepRow]
    )
    set({ pattern: newPattern })
    saveState()
  },

  clearPattern: () => {
    const { pattern, saveState } = get()
    set({
      pattern: {
        ...pattern,
        steps: pattern.steps.map(() => Array(16).fill(false)),
      },
    })
    saveState()
  },

  updateTrackVolume: (track, volume) => {
    const { pattern, saveState } = get()
    set({
      pattern: {
        ...pattern,
        volumes: pattern.volumes.map((vol, index) => (index === track ? volume / 100 : vol)),
      },
    })
    saveState()
  },

  toggleMute: track => {
    const { pattern, saveState } = get()
    set({
      pattern: {
        ...pattern,
        muted: pattern.muted.map((muted, index) => (index === track ? !muted : muted)),
      },
    })
    saveState()
  },

  updateTrackSettings: (trackIndex, settings) => {
    const { tracks, saveState } = get()
    const newTracks = tracks.map((track, index) =>
      index === trackIndex
        ? { ...track, settings }
        : track
    )
    set({ tracks: newTracks })
    saveState()
  },

  updateTrackSettingsRealTime: (trackIndex, settings) => {
    const { tracks } = get()
    // Update tracks without saving to localStorage (temporary for real-time preview)
    const newTracks = tracks.map((track, index) =>
      index === trackIndex
        ? { ...track, settings }
        : track
    )
    set({ tracks: newTracks })
    // Don't call saveState() - these are temporary changes
  },

  // Actions for playback control
  setIsPlaying: isPlaying => set({ isPlaying }),
  setCurrentStep: currentStep => set({ currentStep }),

  updateTempo: newTempo => {
    const { pattern, saveState } = get()
    set({
      tempo: newTempo,
      pattern: { ...pattern, tempo: newTempo },
    })
    saveState()
  },

  // Actions for master audio controls
  updateMasterVolume: volume => {
    set({ masterVolume: volume })
    get().saveState()
  },
  toggleMasterMute: () => {
    const { masterMuted, saveState } = get()
    set({ masterMuted: !masterMuted })
    saveState()
  },

  // Initialize app with default tracks
  initializeApp: async () => {
    const state = get()
    console.log('initializeApp called, isInitializing:', state.isInitializing, 'isInitialized:', state.isInitialized)
    
    // Prevent double initialization
    if (state.isInitializing || state.isInitialized) {
      console.log('App already initializing or initialized, skipping')
      return
    }
    
    // Set initializing flag
    set({ isInitializing: true })
    
    try {
      // Initialize drum sounds API early
      await drumSoundsInstance.initialize()

      // Try to load saved state first
      const savedState = loadAppState()
      console.log('Loaded saved state:', savedState)

      if (savedState && savedState.tracks && savedState.tracks.length > 0) {
        console.log('Restoring saved state with', savedState.tracks.length, 'tracks')
        try {
          // Restore saved state
          // Re-add all saved sounds to DrumSoundsAPI
          for (const track of savedState.tracks) {
            console.log('Adding saved track:', track.name)
            const success = await drumSoundsInstance.addSound(track)
            if (!success) {
              console.warn('Failed to add saved track:', track.name)
            }
          }

          set({
            tracks: savedState.tracks,
            pattern: savedState.pattern,
            tempo: savedState.tempo || 120,
            masterVolume: savedState.masterVolume || 80,
            masterMuted: savedState.masterMuted || false,
            isInitializing: false,
            isInitialized: true,
          })

          console.log('App initialized from saved state with', savedState.tracks.length, 'tracks')
          return
        } catch (error) {
          console.error('Error restoring saved state, falling back to default:', error)
          // Fall through to default initialization
        }
      }

      // If no saved state, create default setup
      const defaultSounds = drumSoundsInstance.getAllSounds()
      
      // Check if we have sounds available
      if (defaultSounds.length === 0) {
        console.warn('No sounds available for initialization, this is expected on first load')
        // Set empty state that will be populated when tracks are manually added
        set({
          tracks: [],
          pattern: {
            steps: [],
            tempo: 120,
            volumes: [],
            muted: [],
          },
          isInitializing: false,
          isInitialized: true,
        })
        console.log('App initialized with empty state - no default sounds available')
        return
      }
    
    const initialTracks = defaultSounds.slice(0, 8) // Start with first 8 sounds

    // Set up default pattern for initial tracks
    const defaultPattern = {
      steps: initialTracks.map(() => Array(16).fill(false)),
      tempo: 120,
      volumes: initialTracks.map(() => 0.8),
      muted: initialTracks.map(() => false),
    }

    // Add some default beats
    if (defaultPattern.steps.length > 0) {
      defaultPattern.steps[0] = [
        true,
        false,
        false,
        false,
        true,
        false,
        false,
        false,
        true,
        false,
        false,
        false,
        true,
        false,
        false,
        false,
      ]
    }
    if (defaultPattern.steps.length > 1) {
      defaultPattern.steps[1] = [
        false,
        false,
        false,
        false,
        true,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        true,
        false,
        false,
        false,
      ]
    }
    if (defaultPattern.steps.length > 2) {
      defaultPattern.steps[2] = [
        false,
        false,
        true,
        false,
        false,
        false,
        true,
        false,
        false,
        false,
        true,
        false,
        false,
        false,
        true,
        false,
      ]
    }

    console.log('Setting initial tracks:', initialTracks.length, 'tracks')
    set({
      tracks: initialTracks,
      pattern: defaultPattern,
      isInitializing: false,
      isInitialized: true,
    })

    // Save the initial state
    get().saveState()
    console.log('App initialization completed with', initialTracks.length, 'tracks')
    } catch (error) {
      console.error('Failed to initialize app:', error)
      // Set minimal state to prevent app crash
      set({
        tracks: [],
        pattern: {
          steps: [],
          tempo: 120,
          volumes: [],
          muted: [],
        },
        isInitializing: false,
        isInitialized: true,
      })
    }
  },
}))

export default useAppStore
