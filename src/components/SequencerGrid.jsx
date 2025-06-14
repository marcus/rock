import { useEffect } from 'react'

function SequencerGrid({ pattern, currentStep, onToggleStep }) {
  const stepButtons = []
  
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 16; col++) {
      const isActive = pattern[row][col]
      const isPlaying = currentStep === col
      const isBeatMarker = col % 4 === 0
      
      stepButtons.push(
        <div
          key={`${row}-${col}`}
          className={`step-button ${isActive ? 'active' : ''} ${isPlaying ? 'playing' : ''} ${isBeatMarker ? 'beat-marker' : ''}`}
          onClick={() => onToggleStep(row, col)}
          data-row={row}
          data-col={col}
        />
      )
    }
  }

  return (
    <div className="sequencer-grid">
      {stepButtons}
    </div>
  )
}

export default SequencerGrid