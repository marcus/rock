function VolumeControls({ volumes, muted, onVolumeChange, onToggleMute }) {
  return (
    <div className='volume-controls'>
      {volumes.map((volume, index) => (
        <div key={index} className='volume-slider'>
          <input
            type='range'
            min='0'
            max='100'
            value={volume * 100}
            onChange={e => onVolumeChange(index, parseInt(e.target.value))}
          />
          <button
            className={`mute-button ${muted[index] ? 'muted' : ''}`}
            onClick={() => onToggleMute(index)}
          >
            M
          </button>
        </div>
      ))}
    </div>
  )
}

export default VolumeControls
