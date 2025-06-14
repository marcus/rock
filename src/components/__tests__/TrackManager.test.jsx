import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals'
import TrackManager from '../TrackManager'

// Mock fetch
global.fetch = jest.fn()

const mockSounds = [
  { id: 1, name: 'Kick Drum', drum_type: 'kick', type: 'sample' },
  { id: 2, name: 'Snare Drum', drum_type: 'snare', type: 'sample' },
  { id: 3, name: 'Hi-Hat', drum_type: 'hihat', type: 'sample' },
  { id: 4, name: 'Crash Cymbal', drum_type: 'crash', type: 'sample' },
  { id: 5, name: 'Cowbell', drum_type: 'cowbell', type: 'sample' }
]

describe('TrackManager Integration Tests', () => {
  let mockProps

  beforeEach(() => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => mockSounds
    })

    mockProps = {
      tracks: [],
      onAddTrack: jest.fn(),
      onRemoveTrack: jest.fn(),
      maxTracks: 40,
      pattern: {},
      currentStep: 0,
      onToggleStep: jest.fn(),
      volumes: {},
      muted: {},
      onVolumeChange: jest.fn(),
      onToggleMute: jest.fn()
    }
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  test('should reproduce the remove-then-re-add bug scenario', async () => {
    // Step 1: Start with no tracks
    const { rerender } = render(<TrackManager {...mockProps} />)

    // Step 2: Open sound selector and add cowbell
    fireEvent.click(screen.getByText('+ Add Sound'))

    await waitFor(() => {
      expect(screen.getByText('Cowbell')).toBeInTheDocument()
    })

    // Select cowbell
    fireEvent.click(screen.getByText('Cowbell'))

    // Verify onAddTrack was called with cowbell
    expect(mockProps.onAddTrack).toHaveBeenCalledWith(
      expect.objectContaining({ id: 5, name: 'Cowbell' })
    )

    // Step 3: Simulate cowbell being added to tracks
    const updatedProps = {
      ...mockProps,
      tracks: [{ id: 5, name: 'Cowbell', drum_type: 'cowbell' }]
    }
    rerender(<TrackManager {...updatedProps} />)

    // Step 4: Remove cowbell from tracks
    fireEvent.click(screen.getByTitle('Remove track'))

    // Verify onRemoveTrack was called
    expect(mockProps.onRemoveTrack).toHaveBeenCalledWith(0)

    // Step 5: Simulate cowbell being removed from tracks
    const removedProps = {
      ...mockProps,
      tracks: []
    }
    rerender(<TrackManager {...removedProps} />)

    // Step 6: Try to add cowbell again - this is where the bug should occur
    fireEvent.click(screen.getByText('+ Add Sound'))

    // Wait for the sound selector to load and check if cowbell is available
    await waitFor(() => {
      expect(screen.getByText('Cowbell')).toBeInTheDocument()
    }, { timeout: 3000 })

    // This test should pass if the bug is fixed
    expect(screen.getByText('Cowbell')).toBeInTheDocument()
  })

  test('should handle multiple add/remove cycles correctly', async () => {
    let currentTracks = []
    
    // Mock onAddTrack to update our local tracks state
    mockProps.onAddTrack.mockImplementation((sound) => {
      currentTracks = [...currentTracks, sound]
    })
    
    // Mock onRemoveTrack to update our local tracks state
    mockProps.onRemoveTrack.mockImplementation((index) => {
      currentTracks = currentTracks.filter((_, i) => i !== index)
    })

    const { rerender } = render(<TrackManager {...mockProps} tracks={currentTracks} />)

    // Cycle 1: Add kick drum
    fireEvent.click(screen.getByText('+ Add Sound'))
    await waitFor(() => {
      expect(screen.getByText('Kick Drum')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('Kick Drum'))
    
    // Update component with new tracks
    rerender(<TrackManager {...mockProps} tracks={currentTracks} />)

    // Cycle 1: Remove kick drum
    if (currentTracks.length > 0) {
      fireEvent.click(screen.getByTitle('Remove track'))
      rerender(<TrackManager {...mockProps} tracks={currentTracks} />)
    }

    // Cycle 2: Add kick drum again
    fireEvent.click(screen.getByText('+ Add Sound'))
    await waitFor(() => {
      expect(screen.getByText('Kick Drum')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('Kick Drum'))
    
    // Update component with new tracks
    rerender(<TrackManager {...mockProps} tracks={currentTracks} />)

    // Cycle 2: Remove kick drum again
    if (currentTracks.length > 0) {
      fireEvent.click(screen.getByTitle('Remove track'))
      rerender(<TrackManager {...mockProps} tracks={currentTracks} />)
    }

    // Cycle 3: Add kick drum one more time - should still work
    fireEvent.click(screen.getByText('+ Add Sound'))
    await waitFor(() => {
      expect(screen.getByText('Kick Drum')).toBeInTheDocument()
    })

    // The kick drum should still be available after multiple cycles
    expect(screen.getByText('Kick Drum')).toBeInTheDocument()
  })

  test('should properly filter used sounds in sound selector', async () => {
    // Start with kick drum already in tracks
    const propsWithTrack = {
      ...mockProps,
      tracks: [{ id: 1, name: 'Kick Drum', drum_type: 'kick' }]
    }

    render(<TrackManager {...propsWithTrack} />)

    // Open sound selector
    fireEvent.click(screen.getByText('+ Add Sound'))

    // Wait for sounds to load
    await waitFor(() => {
      expect(screen.getByText('Snare Drum')).toBeInTheDocument()
    })

    // Kick drum should not be available in the sound selector (already in use)
    // We can see from the test output that only Snare, Hi-Hat, Crash, and Cowbell are in the sounds grid
    // Let's verify that the available sounds don't include Kick Drum
    const soundItems = screen.getAllByText('Kick Drum')
    // Should only find it in the track label, not in the sound selector
    expect(soundItems).toHaveLength(1) // Only in track label, not in sound selector
    
    // Other sounds should be available
    expect(screen.getByText('Snare Drum')).toBeInTheDocument()
    expect(screen.getByText('Hi-Hat')).toBeInTheDocument()
    expect(screen.getByText('Cowbell')).toBeInTheDocument()
  })
}) 