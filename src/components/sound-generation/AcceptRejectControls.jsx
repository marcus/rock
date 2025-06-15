function AcceptRejectControls({ onAccept, onReject, onCancel }) {
  return (
    <div className="accept-reject-controls">
      <button
        onClick={onReject}
        className="reject-button"
      >
        Reject & Try Again
      </button>

      <button
        onClick={onCancel}
        className="cancel-button"
      >
        Cancel
      </button>

      <button
        onClick={onAccept}
        className="accept-button"
      >
        Add to Track
      </button>
    </div>
  )
}

export default AcceptRejectControls
