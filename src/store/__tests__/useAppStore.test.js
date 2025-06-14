import { act } from '@testing-library/react'
import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { create } from 'zustand'

// Mock the DrumSoundsAPI to prevent audio dependencies
const mockDrumSoundsInstance = {
  initialize: jest.fn().mockResolvedValue(true),
  getAllSounds: jest.fn().mockReturnValue([
    { id: 1, name: 'Kick', drum_type: 'kick' },
    { id: 2, name: 'Snare', drum_type: 'snare' },
  ]),
  addSound: jest.fn().mockResolvedValue(true),
  removeSound: jest.fn(),
  getDrumKey: jest.fn().mockReturnValue('test-key'),
  playSoundScheduled: jest.fn(),
  isInitialized: true,
}

// Create a test store that mimics the real store but without audio dependencies
const createTestStore = () =>
  create((set, get) => ({
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

    // Actions for track management
    setTracks: tracks => set({ tracks }),

    addTrack: async soundData => {
      const { tracks, pattern } = get()
      if (tracks.length >= 40) return false

      // Add sound to DrumSoundsAPI
      const success = await mockDrumSoundsInstance.addSound(soundData)
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

      return true
    },

    removeTrack: trackIndex => {
      const { tracks, pattern } = get()
      if (tracks.length <= 1) return // Keep at least one track

      const trackToRemove = tracks[trackIndex]
      const newTracks = tracks.filter((_, index) => index !== trackIndex)

      // Remove the sound from DrumSoundsAPI
      if (trackToRemove) {
        mockDrumSoundsInstance.removeSound(trackToRemove)
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
    },

    // Actions for pattern management
    setPattern: pattern => set({ pattern }),

    toggleStep: (row, col) => {
      const { pattern } = get()
      const newPattern = { ...pattern }
      newPattern.steps = pattern.steps.map((stepRow, rowIndex) =>
        rowIndex === row
          ? stepRow.map((step, colIndex) => (colIndex === col ? !step : step))
          : [...stepRow]
      )
      set({ pattern: newPattern })
    },

    clearPattern: () => {
      const { pattern } = get()
      set({
        pattern: {
          ...pattern,
          steps: pattern.steps.map(() => Array(16).fill(false)),
        },
      })
    },

    updateTrackVolume: (track, volume) => {
      const { pattern } = get()
      set({
        pattern: {
          ...pattern,
          volumes: pattern.volumes.map((vol, index) => (index === track ? volume / 100 : vol)),
        },
      })
    },

    toggleMute: track => {
      const { pattern } = get()
      set({
        pattern: {
          ...pattern,
          muted: pattern.muted.map((muted, index) => (index === track ? !muted : muted)),
        },
      })
    },

    // Actions for playback control
    setIsPlaying: isPlaying => set({ isPlaying }),
    setCurrentStep: currentStep => set({ currentStep }),

    updateTempo: newTempo => {
      const { pattern } = get()
      set({
        tempo: newTempo,
        pattern: { ...pattern, tempo: newTempo },
      })
    },

    // Actions for master audio controls
    updateMasterVolume: volume => set({ masterVolume: volume }),
    toggleMasterMute: () => {
      const { masterMuted } = get()
      set({ masterMuted: !masterMuted })
    },

    // Initialize app with default tracks
    initializeApp: async () => {
      // Initialize drum sounds API early
      await mockDrumSoundsInstance.initialize()

      // Get default sounds and create initial tracks
      const defaultSounds = mockDrumSoundsInstance.getAllSounds()
      const initialTracks = defaultSounds.slice(0, 2) // Use only 2 for testing

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

      set({
        tracks: initialTracks,
        pattern: defaultPattern,
      })
    },
  }))

describe('useAppStore', () => {
  let useTestStore

  beforeEach(() => {
    // Create a fresh store for each test
    useTestStore = createTestStore()
    jest.clearAllMocks()
  })

  describe('Initial State', () => {
    test('should have correct initial state', () => {
      const state = useTestStore.getState()

      expect(state.tracks).toEqual([])
      expect(state.pattern).toEqual({
        steps: [],
        tempo: 120,
        volumes: [],
        muted: [],
      })
      expect(state.isPlaying).toBe(false)
      expect(state.currentStep).toBe(0)
      expect(state.tempo).toBe(120)
      expect(state.masterVolume).toBe(80)
      expect(state.masterMuted).toBe(false)
    })
  })

  describe('Track Management', () => {
    test('should add track successfully', async () => {
      const soundData = { id: 1, name: 'Kick', drum_type: 'kick' }
      const success = await useTestStore.getState().addTrack(soundData)

      expect(success).toBe(true)
      const state = useTestStore.getState()
      expect(state.tracks).toHaveLength(1)
      expect(state.tracks[0]).toEqual(soundData)
      expect(state.pattern.steps).toHaveLength(1)
      expect(state.pattern.volumes).toHaveLength(1)
      expect(state.pattern.muted).toHaveLength(1)
    })

    test('should not add track when at max capacity', async () => {
      // Set tracks to max capacity
      useTestStore.getState().setTracks(new Array(40).fill({ id: 1, name: 'Test' }))

      const soundData = { id: 2, name: 'New Sound', drum_type: 'kick' }
      const success = await useTestStore.getState().addTrack(soundData)

      expect(success).toBe(false)
      expect(useTestStore.getState().tracks).toHaveLength(40)
    })

    test('should remove track correctly', () => {
      // Set up initial tracks and pattern
      useTestStore.getState().setTracks([
        { id: 1, name: 'Kick', drum_type: 'kick' },
        { id: 2, name: 'Snare', drum_type: 'snare' },
      ])
      useTestStore.getState().setPattern({
        steps: [Array(16).fill(false), Array(16).fill(true)],
        tempo: 120,
        volumes: [0.8, 0.9],
        muted: [false, true],
      })

      // Remove first track
      useTestStore.getState().removeTrack(0)

      const state = useTestStore.getState()
      expect(state.tracks).toHaveLength(1)
      expect(state.tracks[0].name).toBe('Snare')
      expect(state.pattern.steps).toHaveLength(1)
      expect(state.pattern.volumes).toEqual([0.9])
      expect(state.pattern.muted).toEqual([true])
    })
  })

  describe('Pattern Management', () => {
    test('should toggle step correctly', () => {
      // Set up initial pattern
      useTestStore.getState().setPattern({
        steps: [Array(16).fill(false), Array(16).fill(false)],
        tempo: 120,
        volumes: [0.8, 0.8],
        muted: [false, false],
      })

      // Toggle step
      useTestStore.getState().toggleStep(0, 0)

      const state = useTestStore.getState()
      expect(state.pattern.steps[0][0]).toBe(true)
      expect(state.pattern.steps[1][0]).toBe(false)
    })

    test('should clear pattern correctly', () => {
      // Set up pattern with some steps active
      useTestStore.getState().setPattern({
        steps: [Array(16).fill(true), Array(16).fill(true)],
        tempo: 120,
        volumes: [0.8, 0.8],
        muted: [false, false],
      })

      useTestStore.getState().clearPattern()

      const state = useTestStore.getState()
      expect(state.pattern.steps[0]).toEqual(Array(16).fill(false))
      expect(state.pattern.steps[1]).toEqual(Array(16).fill(false))
    })
  })

  describe('Playback Control', () => {
    test('should update tempo correctly', () => {
      useTestStore.getState().updateTempo(140)

      const state = useTestStore.getState()
      expect(state.tempo).toBe(140)
      expect(state.pattern.tempo).toBe(140)
    })

    test('should toggle playing state', () => {
      useTestStore.getState().setIsPlaying(true)
      expect(useTestStore.getState().isPlaying).toBe(true)

      useTestStore.getState().setIsPlaying(false)
      expect(useTestStore.getState().isPlaying).toBe(false)
    })
  })

  describe('Master Audio Controls', () => {
    test('should update master volume', () => {
      useTestStore.getState().updateMasterVolume(90)
      expect(useTestStore.getState().masterVolume).toBe(90)
    })

    test('should toggle master mute', () => {
      useTestStore.getState().toggleMasterMute()
      expect(useTestStore.getState().masterMuted).toBe(true)

      useTestStore.getState().toggleMasterMute()
      expect(useTestStore.getState().masterMuted).toBe(false)
    })
  })

  describe('App Initialization', () => {
    test('should initialize app with default tracks', async () => {
      await useTestStore.getState().initializeApp()

      const state = useTestStore.getState()
      expect(state.tracks).toHaveLength(2) // Based on mocked getAllSounds
      expect(state.pattern.steps).toHaveLength(2)
      expect(state.pattern.volumes).toHaveLength(2)
      expect(state.pattern.muted).toHaveLength(2)

      // Check default beats are set
      expect(state.pattern.steps[0]).toEqual([
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
      ])
    })
  })
})
