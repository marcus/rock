const STORAGE_KEY = 'roysrock-sequencer-state'

export const saveAppState = state => {
  try {
    const stateToSave = {
      tracks: state.tracks,
      pattern: state.pattern,
      tempo: state.tempo,
      masterVolume: state.masterVolume,
      masterMuted: state.masterMuted,
      savedAt: Date.now(),
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave))
  } catch (error) {
    console.warn('Failed to save state to localStorage:', error)
  }
}

export const loadAppState = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return null

    const parsedState = JSON.parse(saved)

    // Validate required properties exist
    if (!parsedState.tracks || !parsedState.pattern) {
      return null
    }

    return parsedState
  } catch (error) {
    console.warn('Failed to load state from localStorage:', error)
    return null
  }
}

export const clearAppState = () => {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.warn('Failed to clear state from localStorage:', error)
  }
}
