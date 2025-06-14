import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals'
import SoundSelector from '../SoundSelector'

// Mock fetch
global.fetch = jest.fn()

const mockSounds = [
  { id: 1, name: 'Kick Drum', drum_type: 'kick', type: 'sample' },
  { id: 2, name: 'Snare Drum', drum_type: 'snare', type: 'sample' },
  { id: 3, name: 'Hi-Hat', drum_type: 'hihat', type: 'sample' },
  { id: 4, name: 'Crash Cymbal', drum_type: 'crash', type: 'sample' }
]

describe('SoundSelector', () => {
  beforeEach(() => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => mockSounds
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  test('should show all sounds when no sounds are used', async () => {
    const mockOnClose = jest.fn()
    const mockOnSelectSound = jest.fn()

    render(
      <SoundSelector
        isOpen={true}
        onClose={mockOnClose}
        onSelectSound={mockOnSelectSound}
        usedSounds={[]}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Kick Drum')).toBeInTheDocument()
      expect(screen.getByText('Snare Drum')).toBeInTheDocument()
      expect(screen.getByText('Hi-Hat')).toBeInTheDocument()
      expect(screen.getByText('Crash Cymbal')).toBeInTheDocument()
    })
  })

  test('should filter out currently used sounds', async () => {
    const mockOnClose = jest.fn()
    const mockOnSelectSound = jest.fn()
    const usedSounds = [
      { id: 1, name: 'Kick Drum', drum_type: 'kick' },
      { id: 2, name: 'Snare Drum', drum_type: 'snare' }
    ]

    render(
      <SoundSelector
        isOpen={true}
        onClose={mockOnClose}
        onSelectSound={mockOnSelectSound}
        usedSounds={usedSounds}
      />
    )

    await waitFor(() => {
      expect(screen.queryByText('Kick Drum')).not.toBeInTheDocument()
      expect(screen.queryByText('Snare Drum')).not.toBeInTheDocument()
      expect(screen.getByText('Hi-Hat')).toBeInTheDocument()
      expect(screen.getByText('Crash Cymbal')).toBeInTheDocument()
    })
  })

  test('should show previously removed sounds when they are no longer in usedSounds', async () => {
    const mockOnClose = jest.fn()
    const mockOnSelectSound = jest.fn()

    // Initially, Kick Drum is used
    const { rerender } = render(
      <SoundSelector
        isOpen={true}
        onClose={mockOnClose}
        onSelectSound={mockOnSelectSound}
        usedSounds={[{ id: 1, name: 'Kick Drum', drum_type: 'kick' }]}
      />
    )

    await waitFor(() => {
      expect(screen.queryByText('Kick Drum')).not.toBeInTheDocument()
      expect(screen.getByText('Snare Drum')).toBeInTheDocument()
    })

    // Now remove Kick Drum from usedSounds (simulating track removal)
    rerender(
      <SoundSelector
        isOpen={true}
        onClose={mockOnClose}
        onSelectSound={mockOnSelectSound}
        usedSounds={[]}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Kick Drum')).toBeInTheDocument()
      expect(screen.getByText('Snare Drum')).toBeInTheDocument()
    })
  })

  test('should call onSelectSound when a sound is clicked', async () => {
    const mockOnClose = jest.fn()
    const mockOnSelectSound = jest.fn()

    render(
      <SoundSelector
        isOpen={true}
        onClose={mockOnClose}
        onSelectSound={mockOnSelectSound}
        usedSounds={[]}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Kick Drum')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Kick Drum'))

    expect(mockOnSelectSound).toHaveBeenCalledWith(mockSounds[0])
    expect(mockOnClose).toHaveBeenCalled()
  })

  test('should filter sounds by category', async () => {
    const mockOnClose = jest.fn()
    const mockOnSelectSound = jest.fn()

    render(
      <SoundSelector
        isOpen={true}
        onClose={mockOnClose}
        onSelectSound={mockOnSelectSound}
        usedSounds={[]}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Kick Drum')).toBeInTheDocument()
    })

    // Select kick category
    const categorySelect = screen.getByRole('combobox')
    fireEvent.change(categorySelect, { target: { value: 'kick' } })

    expect(screen.getByText('Kick Drum')).toBeInTheDocument()
    expect(screen.queryByText('Snare Drum')).not.toBeInTheDocument()
    expect(screen.queryByText('Hi-Hat')).not.toBeInTheDocument()
  })

  test('should handle fetch errors gracefully', async () => {
    fetch.mockRejectedValueOnce(new Error('Network error'))

    const mockOnClose = jest.fn()
    const mockOnSelectSound = jest.fn()

    render(
      <SoundSelector
        isOpen={true}
        onClose={mockOnClose}
        onSelectSound={mockOnSelectSound}
        usedSounds={[]}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Error: Network error')).toBeInTheDocument()
    })
  })

  test('should not render when isOpen is false', () => {
    const mockOnClose = jest.fn()
    const mockOnSelectSound = jest.fn()

    render(
      <SoundSelector
        isOpen={false}
        onClose={mockOnClose}
        onSelectSound={mockOnSelectSound}
        usedSounds={[]}
      />
    )

    expect(screen.queryByText('Add Sound')).not.toBeInTheDocument()
  })

  test('should handle the remove-then-re-add bug: sound should be available after being removed from tracks', async () => {
    const mockOnClose = jest.fn()
    const mockOnSelectSound = jest.fn()

    // Add a cowbell sound to our mock data for this test
    const mockSoundsWithCowbell = [
      ...mockSounds,
      { id: 5, name: 'Cowbell', drum_type: 'cowbell', type: 'sample' }
    ]

    fetch.mockResolvedValue({
      ok: true,
      json: async () => mockSoundsWithCowbell
    })

    // Step 1: Initially no sounds are used, cowbell should be available
    const { rerender } = render(
      <SoundSelector
        isOpen={true}
        onClose={mockOnClose}
        onSelectSound={mockOnSelectSound}
        usedSounds={[]}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Cowbell')).toBeInTheDocument()
    })

    // Step 2: Add cowbell to used sounds (simulating adding it to tracks)
    rerender(
      <SoundSelector
        isOpen={true}
        onClose={mockOnClose}
        onSelectSound={mockOnSelectSound}
        usedSounds={[{ id: 5, name: 'Cowbell', drum_type: 'cowbell' }]}
      />
    )

    await waitFor(() => {
      expect(screen.queryByText('Cowbell')).not.toBeInTheDocument()
    })

    // Step 3: Remove cowbell from used sounds (simulating removing it from tracks)
    rerender(
      <SoundSelector
        isOpen={true}
        onClose={mockOnClose}
        onSelectSound={mockOnSelectSound}
        usedSounds={[]}
      />
    )

    // Step 4: Cowbell should be available again - this is where the bug occurs
    await waitFor(() => {
      expect(screen.getByText('Cowbell')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  test('should handle multiple remove-then-re-add cycles correctly', async () => {
    const mockOnClose = jest.fn()
    const mockOnSelectSound = jest.fn()

    // Step 1: Start with kick drum in use
    const { rerender } = render(
      <SoundSelector
        isOpen={true}
        onClose={mockOnClose}
        onSelectSound={mockOnSelectSound}
        usedSounds={[{ id: 1, name: 'Kick Drum', drum_type: 'kick' }]}
      />
    )

    await waitFor(() => {
      expect(screen.queryByText('Kick Drum')).not.toBeInTheDocument()
      expect(screen.getByText('Snare Drum')).toBeInTheDocument()
    })

    // Step 2: Remove kick drum from used sounds
    rerender(
      <SoundSelector
        isOpen={true}
        onClose={mockOnClose}
        onSelectSound={mockOnSelectSound}
        usedSounds={[]}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Kick Drum')).toBeInTheDocument()
    })

    // Step 3: Add kick drum back to used sounds
    rerender(
      <SoundSelector
        isOpen={true}
        onClose={mockOnClose}
        onSelectSound={mockOnSelectSound}
        usedSounds={[{ id: 1, name: 'Kick Drum', drum_type: 'kick' }]}
      />
    )

    await waitFor(() => {
      expect(screen.queryByText('Kick Drum')).not.toBeInTheDocument()
    })

    // Step 4: Remove kick drum again - it should be available again
    rerender(
      <SoundSelector
        isOpen={true}
        onClose={mockOnClose}
        onSelectSound={mockOnSelectSound}
        usedSounds={[]}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Kick Drum')).toBeInTheDocument()
    })
  })

  test('should handle object reference changes in usedSounds correctly', async () => {
    const mockOnClose = jest.fn()
    const mockOnSelectSound = jest.fn()

    // Simulate the real-world scenario where usedSounds objects might have different references
    // but same data (which could cause React to not detect changes properly)
    
    const cowbellSound1 = { id: 5, name: 'Cowbell', drum_type: 'cowbell' }
    const cowbellSound2 = { id: 5, name: 'Cowbell', drum_type: 'cowbell' } // Same data, different object reference

    const mockSoundsWithCowbell = [
      ...mockSounds,
      { id: 5, name: 'Cowbell', drum_type: 'cowbell', type: 'sample' }
    ]

    fetch.mockResolvedValue({
      ok: true,
      json: async () => mockSoundsWithCowbell
    })

    // Step 1: Start with no sounds used
    const { rerender } = render(
      <SoundSelector
        isOpen={true}
        onClose={mockOnClose}
        onSelectSound={mockOnSelectSound}
        usedSounds={[]}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Cowbell')).toBeInTheDocument()
    })

    // Step 2: Add cowbell (first object reference)
    rerender(
      <SoundSelector
        isOpen={true}
        onClose={mockOnClose}
        onSelectSound={mockOnSelectSound}
        usedSounds={[cowbellSound1]}
      />
    )

    await waitFor(() => {
      expect(screen.queryByText('Cowbell')).not.toBeInTheDocument()
    })

    // Step 3: Remove cowbell but use different object reference with same data
    rerender(
      <SoundSelector
        isOpen={true}
        onClose={mockOnClose}
        onSelectSound={mockOnSelectSound}
        usedSounds={[]}
      />
    )

    // Step 4: Cowbell should be available again
    await waitFor(() => {
      expect(screen.getByText('Cowbell')).toBeInTheDocument()
    })

    // Step 5: Add cowbell again with different object reference
    rerender(
      <SoundSelector
        isOpen={true}
        onClose={mockOnClose}
        onSelectSound={mockOnSelectSound}
        usedSounds={[cowbellSound2]}
      />
    )

    await waitFor(() => {
      expect(screen.queryByText('Cowbell')).not.toBeInTheDocument()
    })
  })

  test('should handle fetch being called multiple times during rapid state changes', async () => {
    const mockOnClose = jest.fn()
    const mockOnSelectSound = jest.fn()

    // Track how many times fetch is called
    let fetchCallCount = 0
    fetch.mockImplementation(() => {
      fetchCallCount++
      return Promise.resolve({
        ok: true,
        json: async () => mockSounds
      })
    })

    const { rerender } = render(
      <SoundSelector
        isOpen={true}
        onClose={mockOnClose}
        onSelectSound={mockOnSelectSound}
        usedSounds={[]}
      />
    )

    // Rapidly change usedSounds to simulate real-world rapid state changes
    rerender(
      <SoundSelector
        isOpen={true}
        onClose={mockOnClose}
        onSelectSound={mockOnSelectSound}
        usedSounds={[{ id: 1, name: 'Kick Drum', drum_type: 'kick' }]}
      />
    )

    rerender(
      <SoundSelector
        isOpen={true}
        onClose={mockOnClose}
        onSelectSound={mockOnSelectSound}
        usedSounds={[]}
      />
    )

    rerender(
      <SoundSelector
        isOpen={true}
        onClose={mockOnClose}
        onSelectSound={mockOnSelectSound}
        usedSounds={[{ id: 2, name: 'Snare Drum', drum_type: 'snare' }]}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Kick Drum')).toBeInTheDocument()
      expect(screen.queryByText('Snare Drum')).not.toBeInTheDocument()
    })

    // Verify that fetch was called the expected number of times
    // (should be called for each useEffect trigger)
    expect(fetchCallCount).toBeGreaterThan(1)
  })

  test('should work correctly with DrumSoundsAPI integration - remove then re-add scenario', async () => {
    // Mock the DrumSoundsAPI methods that would be called in the real app
    const mockDrumSoundsAPI = {
      addSound: jest.fn().mockResolvedValue(true),
      removeSound: jest.fn().mockReturnValue(true)
    }

    // Mock the global drumSoundsInstance
    global.drumSoundsInstance = mockDrumSoundsAPI

    const mockOnClose = jest.fn()
    const mockOnSelectSound = jest.fn()

    // Step 1: Start with no sounds used
    const { rerender } = render(
      <SoundSelector
        isOpen={true}
        onClose={mockOnClose}
        onSelectSound={mockOnSelectSound}
        usedSounds={[]}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Kick Drum')).toBeInTheDocument()
    })

    // Step 2: Simulate adding kick drum (it becomes used)
    rerender(
      <SoundSelector
        isOpen={true}
        onClose={mockOnClose}
        onSelectSound={mockOnSelectSound}
        usedSounds={[{ id: 1, name: 'Kick Drum', drum_type: 'kick' }]}
      />
    )

    await waitFor(() => {
      expect(screen.queryByText('Kick Drum')).not.toBeInTheDocument()
    })

    // Step 3: Simulate removing kick drum (it's no longer used)
    // In the real app, this would call drumSoundsInstance.removeSound()
    rerender(
      <SoundSelector
        isOpen={true}
        onClose={mockOnClose}
        onSelectSound={mockOnSelectSound}
        usedSounds={[]}
      />
    )

    // Step 4: Kick drum should be available again for re-adding
    await waitFor(() => {
      expect(screen.getByText('Kick Drum')).toBeInTheDocument()
    })

    // Step 5: Try to add kick drum again - this should work now
    fireEvent.click(screen.getByText('Kick Drum'))

    expect(mockOnSelectSound).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, name: 'Kick Drum' })
    )
    expect(mockOnClose).toHaveBeenCalled()

    // Clean up the global mock
    delete global.drumSoundsInstance
  })
}) 