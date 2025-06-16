import Button from './Button'

function Controls({ isPlaying, tempo, onTogglePlayback, onTempoChange, onClear }) {
  return (
    <div className='controls'>
      <div className='control-group'>
        <Button 
          variant="yellow" 
          active={isPlaying}
          onClick={onTogglePlayback}
          className="play-stop-btn"
        >
          {isPlaying ? 'STOP' : 'PLAY'}
        </Button>
      </div>

      <div className='control-group'>
        <div className='tempo-control'>
          <span className='tempo-label'>TEMPO:</span>
          <input
            type='range'
            min='60'
            max='180'
            value={tempo}
            onChange={e => onTempoChange(parseInt(e.target.value))}
            className='tempo-slider'
          />
          <span className='tempo-value'>{tempo} BPM</span>
        </div>
      </div>

      <div className='control-group'>
        <Button variant="yellow" onClick={onClear}>
          CLEAR
        </Button>
      </div>
    </div>
  )
}

export default Controls
