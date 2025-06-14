import { useRef, useEffect, useState } from 'react'

// Dynamic import to handle Jest compatibility
let Tone = null
if (typeof window !== 'undefined') {
  try {
    // Use dynamic import for ES modules
    import('tone').then((toneModule) => {
      Tone = toneModule.default || toneModule
    }).catch((err) => {
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
    <div
      style={{
        padding: '1rem',
        backgroundColor: '#f9fafb',
        borderRadius: '6px',
        border: '1px solid #e5e7eb',
        marginBottom: '1.5rem',
      }}
    >
      <label
        style={{
          display: 'block',
          marginBottom: '0.5rem',
          fontWeight: '600',
          color: '#374151',
        }}
      >
        🎧 Audio Preview:
      </label>
      
      {error && (
        <div style={{
          padding: '0.5rem',
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '6px',
          color: '#dc2626',
          marginBottom: '0.5rem',
          fontSize: '0.875rem'
        }}>
          {error}
        </div>
      )}
      
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
        <audio
          ref={audioRef}
          controls
          onPlay={handlePlay}
          style={{
            flex: '1',
            height: '40px',
          }}
        >
          <source src={actualAudioUrl} type='audio/mpeg' />
          Your browser does not support the audio element.
        </audio>
        
        <button
          onClick={handleManualPlay}
          disabled={isLoading}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: isLoading ? '#9ca3af' : '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            fontSize: '0.875rem',
            whiteSpace: 'nowrap'
          }}
        >
          {isLoading ? '⏳' : '▶️ Play'}
        </button>
      </div>
      
      <div style={{
        fontSize: '0.75rem',
        color: '#6b7280',
        marginTop: '0.25rem'
      }}>
        Audio URL: <a href={actualAudioUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6' }}>
          {actualAudioUrl}
        </a>
      </div>
    </div>
  )
}

export default AudioPreview
