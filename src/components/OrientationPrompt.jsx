import React, { useState, useEffect } from 'react'
import './OrientationPrompt.css'

const OrientationPrompt = () => {
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    const checkOrientation = () => {
      const isMobile = window.innerWidth <= 768
      const isPortrait = window.innerHeight > window.innerWidth
      
      if (isMobile && isPortrait) {
        setShowPrompt(true)
      } else {
        setShowPrompt(false)
      }
    }

    checkOrientation()
    window.addEventListener('resize', checkOrientation)
    window.addEventListener('orientationchange', checkOrientation)

    return () => {
      window.removeEventListener('resize', checkOrientation)
      window.removeEventListener('orientationchange', checkOrientation)
    }
  }, [])

  if (!showPrompt) return null

  return (
    <div className="orientation-prompt-overlay">
      <div className="orientation-prompt">
        <div className="rotate-icon">📱↻</div>
        <h2>Rotate Device</h2>
        <p>Please rotate your device to landscape mode for the best experience.</p>
      </div>
    </div>
  )
}

export default OrientationPrompt