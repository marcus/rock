function MasterVolumeControl({ masterVolume, masterMuted, onVolumeChange, onToggleMute }) {
  return (
    <div className="master-volume-control">
      <label className="master-volume-label">MASTER VOLUME</label>
      <div className="master-volume-row">
        <input 
          type="range" 
          min="0" 
          max="100" 
          value={masterVolume}
          onChange={(e) => onVolumeChange(parseInt(e.target.value))}
          className="master-volume-slider"
        />
        <button 
          className={`master-mute-button ${masterMuted ? 'muted' : ''}`}
          onClick={onToggleMute}
        >
          M
        </button>
      </div>
    </div>
  )
}

export default MasterVolumeControl 