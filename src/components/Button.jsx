import './Button.css'

function Button({ 
  variant = 'default', // 'default', 'primary', 'secondary', 'danger', 'success', 'warning', 'yellow', 'red', 'pink'
  size = 'medium', // 'small', 'medium', 'large'
  disabled = false,
  loading = false,
  active = false,
  onClick,
  children,
  className = '',
  type = 'button',
  ...props 
}) {
  const handleClick = (e) => {
    if (disabled || loading) return
    onClick?.(e)
  }

  const buttonClass = [
    'button',
    `button-${variant}`,
    `button-${size}`,
    disabled && 'button-disabled',
    loading && 'button-loading',
    active && 'active',
    className
  ].filter(Boolean).join(' ')

  return (
    <button
      type={type}
      className={buttonClass}
      onClick={handleClick}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? 'Loading...' : children}
    </button>
  )
}

export default Button