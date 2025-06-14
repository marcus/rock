import { useState, useEffect } from 'react'
import './TrackSettingsModal.css'

function TrackSettingsModal({ trackId, trackName, trackSettings, onSave, onClose }) {
  const [settings, setSettings] = useState(() => ({
    gain_db: 0,
    pitch_semitones: 0,
    filter: {
      cutoff_hz: 20000,
      resonance_q: 0.7,
    },
    ...trackSettings,
  }))

  useEffect(() => {
    // Only update if trackSettings has meaningful values and is different from current
    if (trackSettings && Object.keys(trackSettings).length > 0) {
      setSettings({
        gain_db: 0,
        pitch_semitones: 0,
        filter: {
          cutoff_hz: 20000,
          resonance_q: 0.7,
        },
        ...trackSettings,
      })
    }
  }, [trackId]) // Only reset when trackId changes (different track)

  const handleSave = () => {
    onSave(settings)
    onClose()
  }

  const handleGainChange = value => {
    setSettings(prev => ({
      ...prev,
      gain_db: parseFloat(value),
    }))
  }

  const handlePitchChange = value => {
    setSettings(prev => ({
      ...prev,
      pitch_semitones: parseFloat(value),
    }))
  }

  const handleCutoffChange = value => {
    setSettings(prev => ({
      ...prev,
      filter: {
        ...prev.filter,
        cutoff_hz: parseFloat(value),
      },
    }))
  }

  const handleResonanceChange = value => {
    setSettings(prev => ({
      ...prev,
      filter: {
        ...prev.filter,
        resonance_q: parseFloat(value),
      },
    }))
  }

  const handleReset = () => {
    setSettings({
      gain_db: 0,
      pitch_semitones: 0,
      filter: {
        cutoff_hz: 20000,
        resonance_q: 0.7,
      },
    })
  }

  return (
    <div className='modal-overlay' onClick={onClose}>
      <div className='modal-content' onClick={e => e.stopPropagation()}>
        <div className='modal-header'>
          <h2>Track Settings</h2>
          <h3>{trackName}</h3>
          <button className='close-button' onClick={onClose}>
            ×
          </button>
        </div>

        <div className='modal-body'>
          <div className='setting-group'>
            <label>
              Gain (dB)
              <span className='setting-value'>{settings.gain_db.toFixed(1)}</span>
            </label>
            <input
              type='range'
              min='-60'
              max='12'
              step='0.1'
              value={settings.gain_db}
              onChange={e => handleGainChange(e.target.value)}
              className='setting-slider'
            />
            <div className='range-labels'>
              <span>-60</span>
              <span>0</span>
              <span>+12</span>
            </div>
          </div>

          <div className='setting-group'>
            <label>
              Pitch (semitones)
              <span className='setting-value'>{settings.pitch_semitones.toFixed(1)}</span>
            </label>
            <input
              type='range'
              min='-24'
              max='24'
              step='0.1'
              value={settings.pitch_semitones}
              onChange={e => handlePitchChange(e.target.value)}
              className='setting-slider'
            />
            <div className='range-labels'>
              <span>-24</span>
              <span>0</span>
              <span>+24</span>
            </div>
          </div>

          <div className='setting-group'>
            <label>
              Filter Cutoff (Hz)
              <span className='setting-value'>{Math.round(settings.filter.cutoff_hz)}</span>
            </label>
            <input
              type='range'
              min='20'
              max='20000'
              step='10'
              value={settings.filter.cutoff_hz}
              onChange={e => handleCutoffChange(e.target.value)}
              className='setting-slider'
            />
            <div className='range-labels'>
              <span>20</span>
              <span>1k</span>
              <span>20k</span>
            </div>
          </div>

          <div className='setting-group'>
            <label>
              Filter Q
              <span className='setting-value'>{settings.filter.resonance_q.toFixed(1)}</span>
            </label>
            <input
              type='range'
              min='0.1'
              max='10.0'
              step='0.1'
              value={settings.filter.resonance_q}
              onChange={e => handleResonanceChange(e.target.value)}
              className='setting-slider'
            />
            <div className='range-labels'>
              <span>0.1</span>
              <span>1.0</span>
              <span>10.0</span>
            </div>
          </div>
        </div>

        <div className='modal-footer'>
          <button className='reset-button' onClick={handleReset}>
            Reset
          </button>
          <div className='action-buttons'>
            <button className='cancel-button' onClick={onClose}>
              Cancel
            </button>
            <button className='save-button' onClick={handleSave}>
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TrackSettingsModal