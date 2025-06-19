import { useState, useEffect } from 'react'
import Modal from './Modal'
import Button from './Button'
import './TrackSettingsModal.css'

function TrackSettingsModal({
  trackId,
  trackName,
  trackSettings,
  onSave,
  onClose,
  onRealTimeUpdate,
}) {
  // Store original settings for cancel functionality
  const [originalSettings] = useState(() => ({
    gain_db: 0,
    pitch_semitones: 0,
    filter: {
      cutoff_hz: 20000,
      resonance_q: 0.7,
    },
    reverb_send: 0,
    delay_send: {
      delay_time: 0.25,
      feedback: 0.3,
      wet_level: 0,
    },
    lfo: {
      frequency: 2.0,
      depth: 0.0,
      type: 'sine',
      target: 'volume',
    },
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
    delay_send: {
      delay_time: 0.25,
      feedback: 0.3,
      wet_level: 0,
    },
    lfo: {
      frequency: 2.0,
      depth: 0.0,
      type: 'sine',
      target: 'volume',
    },
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
        delay_send: {
          delay_time: 0.25,
          feedback: 0.3,
          wet_level: 0,
        },
        lfo: {
          frequency: 2.0,
          depth: 0.0,
          type: 'sine',
          target: 'volume',
        },
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

  const updateSettingsAndApply = newSettings => {
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

  const handleDelayTimeChange = value => {
    const currentDelaySend = settings.delay_send || {
      delay_time: 0.25,
      feedback: 0.3,
      wet_level: 0,
    }
    const newSettings = {
      ...settings,
      delay_send: {
        ...currentDelaySend,
        delay_time: parseFloat(value),
      },
    }
    updateSettingsAndApply(newSettings)
  }

  const handleDelayFeedbackChange = value => {
    const currentDelaySend = settings.delay_send || {
      delay_time: 0.25,
      feedback: 0.3,
      wet_level: 0,
    }
    const newSettings = {
      ...settings,
      delay_send: {
        ...currentDelaySend,
        feedback: parseFloat(value),
      },
    }
    updateSettingsAndApply(newSettings)
  }

  const handleDelayWetLevelChange = value => {
    const currentDelaySend = settings.delay_send || {
      delay_time: 0.25,
      feedback: 0.3,
      wet_level: 0,
    }
    const newSettings = {
      ...settings,
      delay_send: {
        ...currentDelaySend,
        wet_level: parseFloat(value),
      },
    }
    updateSettingsAndApply(newSettings)
  }

  const handleLFOFrequencyChange = value => {
    const currentLFO = settings.lfo || {
      frequency: 2.0,
      depth: 0.0,
      type: 'sine',
      target: 'volume',
    }
    const newSettings = {
      ...settings,
      lfo: {
        ...currentLFO,
        frequency: parseFloat(value),
      },
    }
    updateSettingsAndApply(newSettings)
  }

  const handleLFODepthChange = value => {
    const currentLFO = settings.lfo || {
      frequency: 2.0,
      depth: 0.0,
      type: 'sine',
      target: 'volume',
    }
    const newSettings = {
      ...settings,
      lfo: {
        ...currentLFO,
        depth: parseFloat(value),
      },
    }
    updateSettingsAndApply(newSettings)
  }

  const handleLFOTypeChange = value => {
    const currentLFO = settings.lfo || {
      frequency: 2.0,
      depth: 0.0,
      type: 'sine',
      target: 'volume',
    }
    const newSettings = {
      ...settings,
      lfo: {
        ...currentLFO,
        type: value,
      },
    }
    updateSettingsAndApply(newSettings)
  }

  const handleLFOTargetChange = value => {
    const currentLFO = settings.lfo || {
      frequency: 2.0,
      depth: 0.0,
      type: 'sine',
      target: 'volume',
    }
    const newSettings = {
      ...settings,
      lfo: {
        ...currentLFO,
        target: value,
      },
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
      delay_send: {
        delay_time: 0.25,
        feedback: 0.3,
        wet_level: 0,
      },
      lfo: {
        frequency: 2.0,
        depth: 0.0,
        type: 'sine',
        target: 'volume',
      },
      bitcrush: {
        sample_rate: 44100,
        bit_depth: 16,
      },
    }
    updateSettingsAndApply(resetSettings)
  }

  const footer = (
    <>
      <Button variant='default' onClick={handleReset}>
        Reset
      </Button>
      <div className='action-buttons'>
        <Button variant='default' onClick={handleCancel}>
          Cancel
        </Button>
        <Button variant='primary' onClick={handleSave}>
          Save
        </Button>
      </div>
    </>
  )

  return (
    <Modal
      isOpen={true}
      onClose={handleCancel}
      title='Track Settings'
      subtitle={trackName}
      footer={footer}
      size='medium'
      className='track-settings-modal'
    >
      {/* Basic Audio Controls */}
      <div className='effects-section'>
        <h4 className='section-title'>Audio</h4>
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
      </div>

      {/* Filter Section */}
      <div className='effects-section'>
        <h4 className='section-title'>Filter</h4>
        <div className='setting-group'>
          <label>
            Cutoff (Hz)
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
            Resonance (Q)
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

      {/* Time-Based Effects */}
      <div className='effects-section'>
        <h4 className='section-title'>Time Effects</h4>
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
            Delay Time (s)
            <span className='setting-value'>{settings.delay_send?.delay_time?.toFixed(3) || '0.250'}</span>
          </label>
          <input
            type='range'
            min='0.01'
            max='1.0'
            step='0.01'
            value={settings.delay_send?.delay_time || 0.25}
            onChange={e => handleDelayTimeChange(e.target.value)}
            className='setting-slider'
          />
          <div className='range-labels'>
            <span>0.01</span>
            <span>0.5</span>
            <span>1.0</span>
          </div>
        </div>

        <div className='setting-group'>
          <label>
            Delay Feedback
            <span className='setting-value'>{settings.delay_send?.feedback?.toFixed(2) || '0.30'}</span>
          </label>
          <input
            type='range'
            min='0'
            max='0.95'
            step='0.01'
            value={settings.delay_send?.feedback || 0.3}
            onChange={e => handleDelayFeedbackChange(e.target.value)}
            className='setting-slider'
          />
          <div className='range-labels'>
            <span>0</span>
            <span>0.5</span>
            <span>0.95</span>
          </div>
        </div>

        <div className='setting-group'>
          <label>
            Delay Send
            <span className='setting-value'>{settings.delay_send?.wet_level?.toFixed(2) || '0.00'}</span>
          </label>
          <input
            type='range'
            min='0'
            max='1'
            step='0.01'
            value={settings.delay_send?.wet_level || 0}
            onChange={e => handleDelayWetLevelChange(e.target.value)}
            className='setting-slider'
          />
          <div className='range-labels'>
            <span>0</span>
            <span>0.5</span>
            <span>1</span>
          </div>
        </div>
      </div>

      {/* Modulation Section */}
      <div className='effects-section'>
        <h4 className='section-title'>Modulation</h4>
        <div className='setting-group'>
          <label>
            LFO Frequency (Hz)
            <span className='setting-value'>{settings.lfo?.frequency?.toFixed(1) || '2.0'}</span>
          </label>
          <input
            type='range'
            min='0.1'
            max='20'
            step='0.1'
            value={settings.lfo?.frequency || 2.0}
            onChange={e => handleLFOFrequencyChange(e.target.value)}
            className='setting-slider'
          />
          <div className='range-labels'>
            <span>0.1</span>
            <span>10</span>
            <span>20</span>
          </div>
        </div>

        <div className='setting-group'>
          <label>
            LFO Depth
            <span className='setting-value'>{settings.lfo?.depth?.toFixed(2) || '0.00'}</span>
          </label>
          <input
            type='range'
            min='0'
            max='1'
            step='0.01'
            value={settings.lfo?.depth || 0}
            onChange={e => handleLFODepthChange(e.target.value)}
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
            LFO Type
            <span className='setting-value'>{settings.lfo?.type || 'sine'}</span>
          </label>
          <select
            value={settings.lfo?.type || 'sine'}
            onChange={e => handleLFOTypeChange(e.target.value)}
            className='setting-select'
          >
            <option value='sine'>Sine</option>
            <option value='triangle'>Triangle</option>
            <option value='square'>Square</option>
            <option value='sawtooth'>Sawtooth</option>
          </select>
        </div>

        <div className='setting-group'>
          <label>
            LFO Target
            <span className='setting-value'>{settings.lfo?.target || 'volume'}</span>
          </label>
          <select
            value={settings.lfo?.target || 'volume'}
            onChange={e => handleLFOTargetChange(e.target.value)}
            className='setting-select'
          >
            <option value='volume'>Volume</option>
            <option value='frequency'>Frequency</option>
            <option value='detune'>Detune</option>
            <option value='filter'>Filter</option>
          </select>
        </div>
      </div>

      {/* Distortion Section */}
      <div className='effects-section'>
        <h4 className='section-title'>Distortion</h4>
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
      </div>
    </Modal>
  )
}

export default TrackSettingsModal
