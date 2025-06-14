function SubmitButton({ isLoading, disabled, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || isLoading}
      style={{
        width: '100%',
        padding: '0.875rem 1.5rem',
        backgroundColor: disabled || isLoading ? '#9ca3af' : '#3b82f6',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        fontSize: '1rem',
        fontWeight: '600',
        cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
        transition: 'background-color 0.2s',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
      }}
      onMouseEnter={e => {
        if (!disabled && !isLoading) {
          e.target.style.backgroundColor = '#2563eb'
        }
      }}
      onMouseLeave={e => {
        if (!disabled && !isLoading) {
          e.target.style.backgroundColor = '#3b82f6'
        }
      }}
    >
      {isLoading ? (
        <>
          <div
            style={{
              width: '16px',
              height: '16px',
              border: '2px solid transparent',
              borderTop: '2px solid white',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
          />
          Generating Sound...
        </>
      ) : (
        '🎵 Generate Sound'
      )}

      <style>{`
        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </button>
  )
}

export default SubmitButton
