import { useState } from 'react'
import SoundSelector from './SoundSelector'
import './TrackManager.css'

function TrackManager({
  tracks,
  onAddTrack,
  onRemoveTrack,
  maxTracks = 40,
  pattern,
  currentStep,
  onToggleStep,
  volumes,
  muted,
  onVolumeChange,
  onToggleMute,
}) {
  const [showSoundSelector, setShowSoundSelector] = useState(false)

  const handleAddSound = sound => {
    if (tracks.length < maxTracks) {
      onAddTrack(sound)
    }
  }

  const canAddTrack = tracks.length < maxTracks

  return (
    <div className='track-manager'>
      <div className='tracks-container'>
        {tracks.map((track, trackIndex) => (
          <div key={track.id || trackIndex} className='track-row'>
            <div className='track-info'>
              <div className='track-label'>{track.name || `Track ${trackIndex + 1}`}</div>
              <button
                className='remove-track-button'
                onClick={() => onRemoveTrack(trackIndex)}
                title='Remove track'
              >
                ×
              </button>
            </div>

            <div className='step-row'>
              {Array.from({ length: 16 }, (_, stepIndex) => {
                const isActive = pattern[trackIndex]?.[stepIndex] || false
                const isPlaying = currentStep === stepIndex
                const isBeatMarker = stepIndex % 4 === 0

                return (
                  <div
                    key={`${trackIndex}-${stepIndex}`}
                    className={`step-button ${isActive ? 'active' : ''} ${isPlaying ? 'playing' : ''} ${isBeatMarker ? 'beat-marker' : ''}`}
                    onClick={() => onToggleStep(trackIndex, stepIndex)}
                    data-row={trackIndex}
                    data-col={stepIndex}
                  />
                )
              })}
            </div>

            <div className='track-controls'>
              <input
                type='range'
                min='0'
                max='100'
                value={(volumes[trackIndex] || 0.8) * 100}
                onChange={e => onVolumeChange(trackIndex, parseInt(e.target.value))}
                className='volume-slider'
              />
              <button
                className={`mute-button ${muted[trackIndex] ? 'muted' : ''}`}
                onClick={() => onToggleMute(trackIndex)}
              >
                M
              </button>
            </div>
          </div>
        ))}

        {canAddTrack && (
          <div className='add-track-row'>
            <button className='add-track-button' onClick={() => setShowSoundSelector(true)}>
              + Add Sound
            </button>
            <div className='track-count'>
              {tracks.length} / {maxTracks} tracks
            </div>
          </div>
        )}
      </div>

      <SoundSelector
        isOpen={showSoundSelector}
        onClose={() => setShowSoundSelector(false)}
        onSelectSound={handleAddSound}
        usedSounds={tracks}
      />
    </div>
  )
}

export default TrackManager
