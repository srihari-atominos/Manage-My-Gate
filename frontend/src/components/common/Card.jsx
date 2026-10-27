import React from 'react'
import PropTypes from 'prop-types'

const Card = ({ children, className = '', hover = true, ...props }) => {
  return (
    <div
      className={`card border rounded-4 ${hover ? 'card-hover' : ''} ${className}`}
      style={{
        backgroundColor: 'var(--nahom-surface, #ffffff)',
        borderColor: 'var(--nahom-border, #e4e8f0)',
        boxShadow: 'var(--nahom-shadow-sm, 0 1px 3px rgba(23, 32, 51, 0.05))',
        transition: 'transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease',
      }}
      {...props}
    >
      {children}
    </div>
  )
}

Card.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  hover: PropTypes.bool,
}

export default Card
