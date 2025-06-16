import { useState, useEffect } from 'react'
import Modal from './Modal'
import Button from './Button'
import './TrackSettingsModal.css'

function TrackSettingsModal({ trackId, trackName, trackSettings, onSave, onClose, onRealTimeUpdate }) {
  // Store original settings for cancel functionality
  const [originalSettings] = useState(() => ({
    gain_db: 0,
    pitch_semitones: 0,
    filter: {
      cutoff_hz: 20000,
      resonance_q: 0.7,
    },
    reverb_send: 0,
    bitcrush: {
      sample_rate: 44100,
      bit_depth: 16,
    },
    ...trackSettings,
  }))

  const [settings, setSettings] = useState(() => ({
    gain_db: 0,
    pitch_semitones: 0,
    filter: {
      cutoff_hz: 20000,
      resonance_q: 0.7,
    },
    reverb_send: 0,
    bitcrush: {
      sample_rate: 44100,
      bit_depth: 16,
    },
    ...trackSettings,
  }))

  useEffect(() => {
    // Only update if trackSettings has meaningful values and is different from current
    if (trackSettings && Object.keys(trackSettings).length > 0) {
      const newSettings = {
        gain_db: 0,
        pitch_semitones: 0,
        filter: {
          cutoff_hz: 20000,
          resonance_q: 0.7,
        },
        reverb_send: 0,
        bitcrush: {
          sample_rate: 44100,
          bit_depth: 16,
        },
        ...trackSettings,
      }
      setSettings(newSettings)
    }
  }, [trackId]) // Only reset when trackId changes (different track)

  const handleSave = () => {
    onSave(settings)
    onClose()
  }

  const handleCancel = () => {
    // Revert to original settings
    if (onRealTimeUpdate) {
      onRealTimeUpdate(originalSettings)
    }
    onClose()
  }

  const updateSettingsAndApply = (newSettings) => {
    setSettings(newSettings)
    // Apply changes in real-time if callback provided
    if (onRealTimeUpdate) {
      onRealTimeUpdate(newSettings)
    }
  }

  const handleGainChange = value => {
    const newSettings = {
      ...settings,
      gain_db: parseFloat(value),
    }
    updateSettingsAndApply(newSettings)
  }

  const handlePitchChange = value => {
    const newSettings = {
      ...settings,
      pitch_semitones: parseFloat(value),
    }
    updateSettingsAndApply(newSettings)
  }

  const handleCutoffChange = value => {
    const newSettings = {
      ...settings,
      filter: {
        ...settings.filter,
        cutoff_hz: parseFloat(value),
      },
    }
    updateSettingsAndApply(newSettings)
  }

  const handleResonanceChange = value => {
    const newSettings = {
      ...settings,
      filter: {
        ...settings.filter,
        resonance_q: parseFloat(value),
      },
    }
    updateSettingsAndApply(newSettings)
  }

  const handleReverbSendChange = value => {
    const newSettings = {
      ...settings,
      reverb_send: parseFloat(value),
    }
    updateSettingsAndApply(newSettings)
  }

  const handleBitcrushSampleRateChange = value => {
    const newSettings = {
      ...settings,
      bitcrush: {
        ...settings.bitcrush,
        sample_rate: parseFloat(value),
      },
    }
    updateSettingsAndApply(newSettings)
  }

  const handleBitcrushBitDepthChange = value => {
    const newSettings = {
      ...settings,
      bitcrush: {
        ...settings.bitcrush,
        bit_depth: parseFloat(value),
      },
    }
    updateSettingsAndApply(newSettings)
  }

  const handleReset = () => {
    const resetSettings = {
      gain_db: 0,
      pitch_semitones: 0,
      filter: {
        cutoff_hz: 20000,
        resonance_q: 0.7,
      },
      reverb_send: 0,
      bitcrush: {
        sample_rate: 44100,
        bit_depth: 16,
      },
    }
    updateSettingsAndApply(resetSettings)
  }

  const footer = (
    <>
      <Button variant="default" onClick={handleReset}>
        Reset
      </Button>
      <div className='action-buttons'>
        <Button variant="default" onClick={handleCancel}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSave}>
          Save
        </Button>
      </div>
    </>
  )

  return (
    <Modal
      isOpen={true}
      onClose={handleCancel}
      title="Track Settings"
      subtitle={trackName}
      footer={footer}
      size="medium"
      className="track-settings-modal"
    >
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

      <div className='setting-group'>
        <label>
          Reverb Send
          <span className='setting-value'>{settings.reverb_send.toFixed(2)}</span>
        </label>
        <input
          type='range'
          min='0'
          max='1'
          step='0.01'
          value={settings.reverb_send}
          onChange={e => handleReverbSendChange(e.target.value)}
          className='setting-slider'
        />
        <div className='range-labels'>
          <span>0</span>
          <span>0.5</span>
          <span>1</span>
        </div>
      </div>

      <div className='setting-group'>
        <label>
          Sample Rate (Hz)
          <span className='setting-value'>{Math.round(settings.bitcrush.sample_rate)}</span>
        </label>
        <input
          type='range'
          min='1000'
          max='44100'
          step='100'
          value={settings.bitcrush.sample_rate}
          onChange={e => handleBitcrushSampleRateChange(e.target.value)}
          className='setting-slider'
        />
        <div className='range-labels'>
          <span>1k</span>
          <span>22k</span>
          <span>44k</span>
        </div>
      </div>

      <div className='setting-group'>
        <label>
          Bit Depth
          <span className='setting-value'>{Math.round(settings.bitcrush.bit_depth)}</span>
        </label>
        <input
          type='range'
          min='1'
          max='16'
          step='1'
          value={settings.bitcrush.bit_depth}
          onChange={e => handleBitcrushBitDepthChange(e.target.value)}
          className='setting-slider'
        />
        <div className='range-labels'>
          <span>1</span>
          <span>8</span>
          <span>16</span>
        </div>
      </div>
    </Modal>
  )
}

export default TrackSettingsModal