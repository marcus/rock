function DurationSlider({ value, onChange, disabled = false }) {
  const minDuration = 0.5
  const maxDuration = 1.5

  return (
    <div className="form-group">
      <label htmlFor="duration-slider">
        Duration: {value}s
      </label>
      <input
        id="duration-slider"
        type="range"
        min={minDuration}
        max={maxDuration}
        step="0.1"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        disabled={disabled}
        style={{
          width: '100%',
          height: '6px',
          background: '#e5e7eb',
          borderRadius: '3px',
          outline: 'none',
          cursor: disabled ? 'not-allowed' : 'pointer'
        }}
      />
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '0.875rem',
        color: '#6b7280',
        marginTop: '0.25rem'
      }}>
        <span>{minDuration}s</span>
        <span>{maxDuration}s</span>
      </div>
      <style jsx>{`
        input[type="range"] {
          -webkit-appearance: none;
          appearance: none;
        }
        
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        
        input[type="range"]::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        
        input[type="range"]:disabled::-webkit-slider-thumb {
          background: #9ca3af;
          cursor: not-allowed;
        }
        
        input[type="range"]:disabled::-moz-range-thumb {
          background: #9ca3af;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  )
}

export default DurationSlider