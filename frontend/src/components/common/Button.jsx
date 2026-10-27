import React from 'react'
import PropTypes from 'prop-types'

const variants = {
  primary: 'btn btn-primary text-white fw-semibold shadow-sm',
  secondary: 'btn btn-secondary text-white fw-semibold shadow-sm',
  success: 'btn btn-success text-white fw-semibold shadow-sm',
  danger: 'btn btn-danger text-white fw-semibold shadow-sm',
  warning: 'btn btn-warning text-dark fw-semibold shadow-sm',
  outline: 'btn btn-outline-primary fw-semibold',
  ghost: 'btn btn-link text-decoration-none fw-semibold',
}

const sizes = {
  small: 'btn-sm py-1 px-3 fs-7',
  default: 'py-2 px-4',
  large: 'btn-lg py-3 px-5 fs-6',
}

const Button = ({
  variant = 'primary',
  size = 'default',
  children,
  className = '',
  loading = false,
  disabled = false,
  type = 'button',
  icon,
  ...props
}) => {
  const variantClass = variants[variant] || variants.primary
  const sizeClass = sizes[size] || sizes.default

  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`d-inline-flex align-items-center justify-content-center gap-2 rounded-3 transition-all ${variantClass} ${sizeClass} ${className}`}
      style={{
        transition: 'all 180ms cubic-bezier(0.16, 1, 0.3, 1)',
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
      }}
      {...props}
    >
      {loading && (
        <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true" />
      )}
      {!loading && icon && <span className="d-inline-flex align-items-center">{icon}</span>}
      <span>{children}</span>
    </button>
  )
}

Button.propTypes = {
  variant: PropTypes.oneOf([
    'primary',
    'secondary',
    'success',
    'danger',
    'warning',
    'outline',
    'ghost',
  ]),
  size: PropTypes.oneOf(['small', 'default', 'large']),
  children: PropTypes.node,
  className: PropTypes.string,
  loading: PropTypes.bool,
  disabled: PropTypes.bool,
  type: PropTypes.string,
  icon: PropTypes.node,
}

export default Button
