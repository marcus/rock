function AcceptRejectControls({ onAccept, onReject, onCancel }) {
  return (
    <div style={{
      display: 'flex',
      gap: '0.75rem',
      justifyContent: 'space-between',
      marginTop: '1.5rem'
    }}>
      <button
        onClick={onReject}
        style={{
          flex: '1',
          padding: '0.75rem 1rem',
          backgroundColor: '#f59e0b',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          fontSize: '0.875rem',
          fontWeight: '600',
          cursor: 'pointer',
          transition: 'background-color 0.2s'
        }}
        onMouseEnter={(e) => e.target.style.backgroundColor = '#d97706'}
        onMouseLeave={(e) => e.target.style.backgroundColor = '#f59e0b'}
      >
        🔄 Reject & Try Again
      </button>
      
      <button
        onClick={onCancel}
        style={{
          flex: '1',
          padding: '0.75rem 1rem',
          backgroundColor: '#6b7280',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          fontSize: '0.875rem',
          fontWeight: '600',
          cursor: 'pointer',
          transition: 'background-color 0.2s'
        }}
        onMouseEnter={(e) => e.target.style.backgroundColor = '#4b5563'}
        onMouseLeave={(e) => e.target.style.backgroundColor = '#6b7280'}
      >
        ❌ Cancel
      </button>
      
      <button
        onClick={onAccept}
        style={{
          flex: '1',
          padding: '0.75rem 1rem',
          backgroundColor: '#10b981',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          fontSize: '0.875rem',
          fontWeight: '600',
          cursor: 'pointer',
          transition: 'background-color 0.2s'
        }}
        onMouseEnter={(e) => e.target.style.backgroundColor = '#059669'}
        onMouseLeave={(e) => e.target.style.backgroundColor = '#10b981'}
      >
        ✅ Add to Track
      </button>
    </div>
  )
}

export default AcceptRejectControls