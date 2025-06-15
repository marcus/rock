import { useRef, useEffect, useState } from 'react'

// Dynamic import to handle Jest compatibility
let Tone = null
if (typeof window !== 'undefined') {
  try {
    // Use dynamic import for ES modules
    import('tone')
      .then(toneModule => {
        Tone = toneModule.default || toneModule
      })
      .catch(err => {
        console.warn('Tone.js not available:', err)
      })
  } catch (err) {
    console.warn('Tone.js not available:', err)
  }
}

function AudioPreview({ audioUrl }) {
  const audioRef = useRef(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (audioRef.current && audioUrl) {
      audioRef.current.load()
      setError(null)
    }
  }, [audioUrl])

  // Get the proper audio URL for the current environment
  const getAudioUrl = () => {
    if (!audioUrl) return null

    // If the URL is relative, make sure it points to the backend server in development
    if (audioUrl.startsWith('/audio/')) {
      // In development, audio files are served by the backend server
      const isDev = typeof window !== 'undefined' && window.location?.port === '5173'
      return isDev ? `http://localhost:3001${audioUrl}` : audioUrl
    }

    return audioUrl
  }

  const actualAudioUrl = getAudioUrl()

  const handlePlay = async () => {
    try {
      // Ensure Tone.js AudioContext is started
      if (Tone && Tone.context && Tone.context.state !== 'running') {
        await Tone.start()
      }
    } catch (err) {
      console.error('Error starting audio context:', err)
    }
  }

  const handleManualPlay = async () => {
    if (!audioRef.current) return

    setIsLoading(true)
    setError(null)

    try {
      // Ensure Tone.js AudioContext is started
      if (Tone && Tone.context && Tone.context.state !== 'running') {
        await Tone.start()
      }

      await audioRef.current.play()
    } catch (err) {
      console.error('Error playing audio:', err)
      setError('Unable to play audio. Please check if the file was generated correctly.')
    } finally {
      setIsLoading(false)
    }
  }

  if (!actualAudioUrl) {
    return (
      <div
        style={{
          padding: '2rem',
          textAlign: 'center',
          color: '#6b7280',
          backgroundColor: '#f9fafb',
          borderRadius: '6px',
          border: '1px dashed #d1d5db',
        }}
      >
        No audio to preview
      </div>
    )
  }

  return (
    <div className="audio-preview-container">
      <label className="audio-preview-label">
        Audio Preview:
      </label>

      {error && (
        <div className="audio-preview-error">
          {error}
        </div>
      )}

      <div className="audio-preview-controls">
        <button
          onClick={handleManualPlay}
          disabled={isLoading}
          className={`play-button ${isLoading ? 'loading' : ''}`}
        >
          {isLoading ? 'Loading...' : 'PLAY'}
        </button>
      </div>

      <audio
        ref={audioRef}
        onPlay={handlePlay}
        style={{ display: 'none' }}
      >
        <source src={actualAudioUrl} type='audio/mpeg' />
      </audio>
    </div>
  )
}

export default AudioPreview
