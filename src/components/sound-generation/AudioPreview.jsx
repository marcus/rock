import { useRef, useEffect } from 'react'

function AudioPreview({ audioUrl }) {
  const audioRef = useRef(null)

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.load()
    }
  }, [audioUrl])

  if (!audioUrl) {
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
      <audio
        ref={audioRef}
        controls
        style={{
          width: '100%',
          height: '40px',
        }}
      >
        <source src={audioUrl} type='audio/mpeg' />
        Your browser does not support the audio element.
      </audio>
    </div>
  )
}

export default AudioPreview
