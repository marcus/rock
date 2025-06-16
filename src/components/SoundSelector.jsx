import { useState, useEffect, useMemo, useCallback } from 'react'
import Modal from './Modal'
import Button from './Button'
import SoundGenerationModal from './SoundGenerationModal'
import './SoundSelector.css'

function SoundSelector({ isOpen, onClose, onSelectSound, usedSounds = [] }) {
  const [availableSounds, setAvailableSounds] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [showGenerateFilter, setShowGenerateFilter] = useState(false)
  const [isGenerationModalOpen, setIsGenerationModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentAudio, setCurrentAudio] = useState(null)
  const [playingSound, setPlayingSound] = useState(null)
  const [progress, setProgress] = useState(0)
  const [previewDisabled, setPreviewDisabled] = useState(false)
  const [failureCount, setFailureCount] = useState(0)

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

  // Cleanup audio when modal closes
  useEffect(() => {
    if (!isOpen) {
      stopSound()
    }
  }, [isOpen])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (currentAudio) {
        currentAudio.pause()
        currentAudio.currentTime = 0
      }
    }
  }, [])

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

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(sound => 
        sound.name.toLowerCase().includes(query) ||
        sound.drum_type.toLowerCase().includes(query) ||
        (sound.prompt && sound.prompt.toLowerCase().includes(query))
      )
    }

    return filtered
  }

  const handleGeneratedSoundAccept = generatedSound => {
    onSelectSound(generatedSound)
    setIsGenerationModalOpen(false)
  }


  const playSound = async (sound) => {
    try {
      // Stop any currently playing audio
      if (currentAudio) {
        currentAudio.pause()
        currentAudio.currentTime = 0
        setCurrentAudio(null)
      }

      // Check if sound has audio_url for preview
      if (!sound.audio_url) {
        console.log('Sound preview not available - no audio URL provided')
        return
      }

      // Skip if previews are disabled due to repeated failures
      if (previewDisabled) {
        console.log('Audio preview disabled')
        return
      }

      setPlayingSound(sound.id)
      setProgress(0)

      // Create audio element
      const audio = new Audio()
      audio.preload = 'metadata'
      audio.volume = 0.3 // Lower volume for preview
      audio.src = sound.audio_url
      
      console.log('Loading audio from:', sound.audio_url)
      setCurrentAudio(audio)

      // Wait for audio to be ready
      await new Promise((resolve, reject) => {
        const handleLoad = () => {
          audio.removeEventListener('canplaythrough', handleLoad)
          audio.removeEventListener('error', handleError)
          resolve()
        }
        
        const handleError = (e) => {
          audio.removeEventListener('canplaythrough', handleLoad)
          audio.removeEventListener('error', handleError)
          reject(e)
        }
        
        audio.addEventListener('canplaythrough', handleLoad, { once: true })
        audio.addEventListener('error', handleError, { once: true })
        
        // Timeout after 3 seconds
        setTimeout(() => reject(new Error('Audio load timeout')), 3000)
      })

      // Reset failure count on successful load
      if (failureCount > 0) {
        setFailureCount(0)
      }

      // Update progress during playback
      const updateProgress = () => {
        if (audio.duration && audio.currentTime) {
          const progressPercent = (audio.currentTime / audio.duration) * 100
          setProgress(progressPercent)
        }
      }

      audio.addEventListener('timeupdate', updateProgress)
      audio.addEventListener('ended', () => {
        setPlayingSound(null)
        setProgress(0)
        setCurrentAudio(null)
      })

      // Play with user gesture context
      await audio.play()
      
    } catch (error) {
      console.log('Audio preview failed for sound:', sound.name, '-', error.message || error)
      
      // Increment failure count and disable previews if too many failures
      const newFailureCount = failureCount + 1
      setFailureCount(newFailureCount)
      
      if (newFailureCount >= 3) {
        setPreviewDisabled(true)
        console.log('Audio preview disabled due to repeated failures')
      }
      
      setPlayingSound(null)
      setProgress(0)
      setCurrentAudio(null)
    }
  }

  const stopSound = () => {
    if (currentAudio) {
      currentAudio.pause()
      currentAudio.currentTime = 0
    }
    setPlayingSound(null)
    setProgress(0)
    setCurrentAudio(null)
  }

  const handleSoundHover = (sound) => {
    // Stop any currently playing sound
    if (currentAudio) {
      stopSound()
    }
    
    // Play sound immediately on hover
    playSound(sound)
  }

  const handleSoundLeave = () => {
    // Stop sound when leaving
    stopSound()
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
        <Button variant="secondary" onClick={() => setIsGenerationModalOpen(true)}>
          + Create New Sound
        </Button>
      </div>

      <div className='sound-selector-filters'>
        <div className='filter-group search-group'>
          <label>SEARCH:</label>
          <input
            type='text'
            placeholder='Search sounds by name, type, or description...'
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className='search-input'
          />
        </div>

        <div className='filter-group'>
          <label>CATEGORY:</label>
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
            SHOW ONLY AI-GENERATED SOUNDS
          </label>
        </div>
      </div>

      <div className='sound-selector-content'>
        {loading && <div className='loading'>Loading sounds...</div>}
        {error && <div className='error'>Error: {error}</div>}

        {!loading && !error && (
          <div className='sounds-grid'>
            {getFilteredSounds().map(sound => (
              <div 
                key={sound.id} 
                className='sound-item' 
                onClick={() => handleSoundSelect(sound)}
                onMouseEnter={() => handleSoundHover(sound)}
                onMouseLeave={handleSoundLeave}
              >
                {playingSound === sound.id && (
                  <div 
                    className='sound-progress-bar' 
                    style={{ width: `${progress}%` }}
                  />
                )}
                <div className='sound-name'>{sound.name}</div>
                {!sound.audio_url && (
                  <div className='sound-preview-unavailable'>Preview not available</div>
                )}
                {previewDisabled && (
                  <div className='sound-preview-unavailable'>Preview disabled</div>
                )}
                <div className='sound-details'>
                  <span className='sound-type'>{sound.drum_type.replace('_', ' ')}</span>
                  <span 
                    className='sound-meta' 
                    data-type={sound.is_generated ? 'ai' : sound.type === 'sample' ? 'sample' : 'synth'}
                  >
                    {sound.is_generated
                      ? 'AI'
                      : sound.type === 'sample'
                        ? 'Sample'
                        : 'Synth'}
                  </span>
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
