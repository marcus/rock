import { useState, useEffect } from 'react'
import './SoundSelector.css'

function SoundSelector({ isOpen, onClose, onSelectSound, usedSounds = [] }) {
  const [availableSounds, setAvailableSounds] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState('all')

  useEffect(() => {
    if (isOpen) {
      fetchAvailableSounds()
    }
  }, [isOpen])

  const fetchAvailableSounds = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/sounds')
      if (!response.ok) {
        throw new Error('Failed to fetch sounds')
      }
      
      const allSounds = await response.json()
      
      // Filter out sounds that are already in use
      const usedSoundIds = usedSounds.map(sound => sound.id)
      const filtered = allSounds.filter(sound => !usedSoundIds.includes(sound.id))
      
      setAvailableSounds(filtered)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSoundSelect = (sound) => {
    onSelectSound(sound)
    onClose()
  }

  const getUniqueCategories = () => {
    const categories = ['all', ...new Set(availableSounds.map(sound => sound.drum_type))]
    return categories
  }

  const getFilteredSounds = () => {
    if (selectedCategory === 'all') {
      return availableSounds
    }
    return availableSounds.filter(sound => sound.drum_type === selectedCategory)
  }

  if (!isOpen) return null

  return (
    <div className="sound-selector-overlay" onClick={onClose}>
      <div className="sound-selector-modal" onClick={(e) => e.stopPropagation()}>
        <div className="sound-selector-header">
          <h2>Add Sound</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="sound-selector-filters">
          <label>Category:</label>
          <select 
            value={selectedCategory} 
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            {getUniqueCategories().map(category => (
              <option key={category} value={category}>
                {category === 'all' ? 'All Categories' : category.replace('_', ' ').toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        <div className="sound-selector-content">
          {loading && <div className="loading">Loading sounds...</div>}
          {error && <div className="error">Error: {error}</div>}
          
          {!loading && !error && (
            <div className="sounds-grid">
              {getFilteredSounds().map(sound => (
                <div 
                  key={sound.id} 
                  className="sound-item"
                  onClick={() => handleSoundSelect(sound)}
                >
                  <div className="sound-name">{sound.name}</div>
                  <div className="sound-type">{sound.drum_type.replace('_', ' ')}</div>
                  <div className="sound-meta">
                    {sound.type === 'sample' ? '🎵 Sample' : '🎛️ Synth'}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {!loading && !error && getFilteredSounds().length === 0 && (
            <div className="no-sounds">No available sounds in this category</div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SoundSelector 