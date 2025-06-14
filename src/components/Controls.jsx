function Controls({ 
  isPlaying, 
  tempo, 
  masterVolume, 
  onTogglePlayback, 
  onTempoChange, 
  onVolumeChange, 
  onClear 
}) {
  return (
    <div className="controls">
      <div className="control-group">
        <button 
          className={isPlaying ? 'active' : ''}
          onClick={onTogglePlayback}
        >
          {isPlaying ? 'STOP' : 'PLAY'}
        </button>
      </div>
      
      <div className="control-group">
        <label className="control-label">TEMPO</label>
        <input 
          type="range" 
          min="60" 
          max="180" 
          value={tempo}
          onChange={(e) => onTempoChange(parseInt(e.target.value))}
        />
        <div className="tempo-display">{tempo} BPM</div>
      </div>
      
      <div className="control-group">
        <label className="control-label">VOLUME</label>
        <input 
          type="range" 
          min="0" 
          max="100" 
          value={masterVolume}
          onChange={(e) => onVolumeChange(parseInt(e.target.value))}
        />
      </div>
      
      <div className="control-group">
        <button onClick={onClear}>CLEAR</button>
      </div>
    </div>
  )
}

export default Controls