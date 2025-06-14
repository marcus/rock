import React from 'react'

function SequencerGrid({
  pattern,
  currentStep,
  onToggleStep,
  volumes,
  muted,
  onVolumeChange,
  onToggleMute,
}) {
  const trackNames = ['KICK', 'SNARE', 'HAT-C', 'HAT-O', 'CRASH', 'CLAP', 'COWBELL', 'TOM']

  const rows = []

  for (let row = 0; row < 8; row++) {
    const stepButtons = []

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

    rows.push(
      <div key={row} className='sequencer-row'>
        <div className='track-label'>{trackNames[row]}</div>
        <div className='step-row'>{stepButtons}</div>
        <div className='volume-slider'>
          <input
            type='range'
            min='0'
            max='100'
            value={volumes[row] * 100}
            onChange={e => onVolumeChange(row, parseInt(e.target.value))}
          />
          <button
            className={`mute-button ${muted[row] ? 'muted' : ''}`}
            onClick={() => onToggleMute(row)}
          >
            M
          </button>
        </div>
      </div>
    )
  }

  return <div className='sequencer-grid'>{rows}</div>
}

export default SequencerGrid
