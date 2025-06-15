import { useState, useEffect, useMemo, useCallback } from 'react'
import Modal from './Modal'
import SoundGenerationModal from './SoundGenerationModal'
import './SoundSelector.css'

function SoundSelector({ isOpen, onClose, onSelectSound, usedSounds = [] }) {
  const [availableSounds, setAvailableSounds] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [showGenerateFilter, setShowGenerateFilter] = useState(false)
  const [isGenerationModalOpen, setIsGenerationModalOpen] = useState(false)

  // Create a stable reference for used sound IDs to ensure useEffect triggers correctly
  const usedSoundIds = useMemo(() => {
    const ids = usedSounds.map(sound => sound.id)
    return ids
  }, [usedSounds])

  // Also track the length and content to ensure we catch all changes
  const usedSoundsKey = useMemo(() => {
    return `${usedSounds.length}-${usedSounds
      .map(s => s.id)
      .sort()
      .join(',')}`
  }, [usedSounds])

  const fetchAvailableSounds = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Add cache-busting parameter to prevent browser caching issues
      const timestamp = Date.now()
      const response = await fetch(`/api/sounds?_t=${timestamp}`, {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch sounds')
      }

      const allSounds = await response.json()

      // Filter out sounds that are already in use
      const filtered = allSounds.filter(sound => !usedSoundIds.includes(sound.id))

      setAvailableSounds(filtered)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [usedSoundIds])

  useEffect(() => {
    if (isOpen) {
      fetchAvailableSounds()
    }
  }, [isOpen, usedSoundIds, usedSoundsKey, fetchAvailableSounds])

  // Additional effect to force refresh when sound selector opens
  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure state has settled
      const timeoutId = setTimeout(() => {
        fetchAvailableSounds()
      }, 100)

      return () => clearTimeout(timeoutId)
    }
  }, [isOpen, fetchAvailableSounds])

  const handleSoundSelect = sound => {
    onSelectSound(sound)
    onClose()
  }

  const getUniqueCategories = () => {
    const categories = ['all', ...new Set(availableSounds.map(sound => sound.drum_type))]
    return categories
  }

  const getFilteredSounds = () => {
    let filtered = availableSounds

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(sound => sound.drum_type === selectedCategory)
    }

    if (showGenerateFilter) {
      filtered = filtered.filter(sound => sound.is_generated)
    }

    return filtered
  }

  const handleGeneratedSoundAccept = generatedSound => {
    onSelectSound(generatedSound)
    setIsGenerationModalOpen(false)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Sound"
      size="large"
      className="sound-selector-modal"
    >
      <div className='sound-selector-actions'>
        <button className='create-sound-button' onClick={() => setIsGenerationModalOpen(true)}>
          + Create New Sound
        </button>
      </div>

      <div className='sound-selector-filters'>
        <div className='filter-group'>
          <label>Category:</label>
          <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}>
            {getUniqueCategories().map(category => (
              <option key={category} value={category}>
                {category === 'all' ? 'All Categories' : category.replace('_', ' ').toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        <div className='filter-group'>
          <label>
            <input
              type='checkbox'
              checked={showGenerateFilter}
              onChange={e => setShowGenerateFilter(e.target.checked)}
            />
            Show only AI-generated sounds
          </label>
        </div>
      </div>

      <div className='sound-selector-content'>
        {loading && <div className='loading'>Loading sounds...</div>}
        {error && <div className='error'>Error: {error}</div>}

        {!loading && !error && (
          <div className='sounds-grid'>
            {getFilteredSounds().map(sound => (
              <div key={sound.id} className='sound-item' onClick={() => handleSoundSelect(sound)}>
                <div className='sound-name'>{sound.name}</div>
                <div className='sound-type'>{sound.drum_type.replace('_', ' ')}</div>
                <div className='sound-meta'>
                  {sound.is_generated
                    ? 'AI Generated'
                    : sound.type === 'sample'
                      ? 'Sample'
                      : 'Synth'}
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && !error && getFilteredSounds().length === 0 && (
          <div className='no-sounds'>No available sounds in this category</div>
        )}
      </div>

      <SoundGenerationModal
        isOpen={isGenerationModalOpen}
        onClose={() => setIsGenerationModalOpen(false)}
        onAcceptSound={handleGeneratedSoundAccept}
      />
    </Modal>
  )
}

export default SoundSelector
