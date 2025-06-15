import './Modal.css'

function Modal({ 
  isOpen, 
  onClose, 
  title, 
  subtitle,
  children,
  footer,
  className = '',
  size = 'medium' // 'small', 'medium', 'large'
}) {
  if (!isOpen) return null

  const modalSizeClass = `modal-${size}`

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className={`modal-content ${modalSizeClass} ${className}`} 
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          {title && <h2>{title}</h2>}
          {subtitle && <h3>{subtitle}</h3>}
          <button className="modal-close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
          {children}
        </div>

        {footer && (
          <div className="modal-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

export default Modal