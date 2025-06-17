import { useState } from 'react'
import Modal from './Modal'
import Button from './Button'
import PromptInput from './sound-generation/PromptInput'
import DurationSlider from './sound-generation/DurationSlider'
import AudioPreview from './sound-generation/AudioPreview'
import './SoundGenerationModal.css'

const DRUM_TYPES = [
  { value: 'kick', label: 'Kick' },
  { value: 'snare', label: 'Snare' },
  { value: 'hihat_closed', label: 'Hi-Hat (Closed)' },
  { value: 'hihat_open', label: 'Hi-Hat (Open)' },
  { value: 'crash', label: 'Crash' },
  { value: 'clap', label: 'Clap' },
  { value: 'cowbell', label: 'Cowbell' },
  { value: 'tom_low', label: 'Tom (Low)' },
  { value: 'tom_mid', label: 'Tom (Mid)' },
  { value: 'tom_high', label: 'Tom (High)' },
  { value: 'ride', label: 'Ride' },
  { value: 'percussion', label: 'Percussion' },
  { value: 'fx', label: 'FX' },
  { value: 'other', label: 'Other' },
]

function SoundGenerationModal({ isOpen, onClose, onAcceptSound }) {
  const [prompt, setPrompt] = useState('')
  const [duration, setDuration] = useState(0.5)
  const [drumType, setDrumType] = useState('kick')
  const [name, setName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [generatedSound, setGeneratedSound] = useState(null)
  const [error, setError] = useState(null)

  const handleSubmit = async () => {
    if (!prompt.trim() || !name.trim()) {
      setError('Please provide both a name and prompt')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/sounds/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          duration,
          name: name.trim(),
          drumType,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate sound')
      }

      const soundData = await response.json()
      setGeneratedSound(soundData)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAccept = () => {
    if (generatedSound) {
      onAcceptSound(generatedSound)
      handleClose()
    }
  }

  const handleReject = () => {
    setGeneratedSound(null)
  }

  const handleClose = () => {
    setPrompt('')
    setDuration(0.5)
    setDrumType('kick')
    setName('')
    setIsLoading(false)
    setGeneratedSound(null)
    setError(null)
    onClose()
  }

  const canSubmit = prompt.trim() && name.trim() && !isLoading

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title='Create New Sound'
      size='medium'
      className='sound-generation-modal'
    >
      {error && (
        <div className='sound-generation-error'>
          <strong>Error:</strong> {error}
        </div>
      )}

      {!generatedSound ? (
        <div className='sound-generation-form'>
          <div className='form-group'>
            <label htmlFor='sound-name'>SOUND NAME:</label>
            <input
              id='sound-name'
              type='text'
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder='e.g., Heavy Kick, Crisp Snare...'
              maxLength='50'
            />
          </div>

          <div className='form-group'>
            <label htmlFor='drum-type'>DRUM TYPE:</label>
            <select id='drum-type' value={drumType} onChange={e => setDrumType(e.target.value)}>
              {DRUM_TYPES.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <PromptInput value={prompt} onChange={setPrompt} disabled={isLoading} />

          <DurationSlider value={duration} onChange={setDuration} disabled={isLoading} />

          <Button
            variant='primary'
            loading={isLoading}
            disabled={!canSubmit}
            onClick={handleSubmit}
          >
            Generate Sound
          </Button>
        </div>
      ) : (
        <div className='sound-generation-preview'>
          <h3>Generated Sound Preview</h3>
          <div className='sound-details'>
            <p>
              <strong>Name:</strong> {name}
            </p>
            <p>
              <strong>Type:</strong> {DRUM_TYPES.find(t => t.value === drumType)?.label}
            </p>
            <p>
              <strong>Prompt:</strong> "{prompt}"
            </p>
            <p>
              <strong>Duration:</strong> {duration}s
            </p>
          </div>

          <AudioPreview audioUrl={generatedSound.audioUrl} />

          <div className='accept-reject-controls'>
            <Button variant='warning' onClick={handleReject}>
              Try Again
            </Button>
            <Button variant='default' onClick={handleClose}>
              Cancel
            </Button>
            <Button variant='success' onClick={handleAccept}>
              Accept
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}

export default SoundGenerationModal
