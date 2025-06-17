import { useState } from 'react'
import Button from './Button'
import SoundSelector from './SoundSelector'
import TrackSettingsModal from './TrackSettingsModal'
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
  onUpdateTrackSettings,
  onRealTimeUpdateTrackSettings,
}) {
  const [showSoundSelector, setShowSoundSelector] = useState(false)
  const [activeTrackIndex, setActiveTrackIndex] = useState(null)

  const handleAddSound = sound => {
    if (tracks.length < maxTracks) {
      onAddTrack(sound)
    }
  }

  const handleTrackSettingsSave = settings => {
    if (activeTrackIndex !== null && onUpdateTrackSettings) {
      onUpdateTrackSettings(activeTrackIndex, settings)
    }
  }

  const handleRealTimeUpdate = settings => {
    if (activeTrackIndex !== null && onRealTimeUpdateTrackSettings) {
      onRealTimeUpdateTrackSettings(activeTrackIndex, settings)
    }
  }

  const canAddTrack = tracks.length < maxTracks

  return (
    <div className='track-manager'>
      <div className='tracks-container'>
        {tracks.map((track, trackIndex) => (
          <div key={track.id || trackIndex} className='track-row'>
            <div className='track-info'>
              <div
                className='track-label clickable'
                onClick={() => setActiveTrackIndex(trackIndex)}
                title='Click to edit track settings'
              >
                {track.name || `Track ${trackIndex + 1}`}
              </div>
              <Button
                variant='red'
                size='small'
                className='remove-track-button'
                onClick={() => onRemoveTrack(trackIndex)}
                title='Remove track'
              >
                ×
              </Button>
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
              <Button
                variant='pink'
                size='small'
                className={`mute-button ${muted[trackIndex] ? 'muted' : ''}`}
                onClick={() => onToggleMute(trackIndex)}
              >
                M
              </Button>
            </div>
          </div>
        ))}

        {canAddTrack && (
          <div className='add-track-row'>
            <Button
              variant='yellow'
              className='add-track-button'
              onClick={() => setShowSoundSelector(true)}
            >
              + Add Sound
            </Button>
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

      {activeTrackIndex !== null && (
        <TrackSettingsModal
          trackId={tracks[activeTrackIndex]?.id}
          trackName={tracks[activeTrackIndex]?.name || `Track ${activeTrackIndex + 1}`}
          trackSettings={tracks[activeTrackIndex]?.settings || {}}
          onSave={handleTrackSettingsSave}
          onClose={() => setActiveTrackIndex(null)}
          onRealTimeUpdate={handleRealTimeUpdate}
        />
      )}
    </div>
  )
}

export default TrackManager
