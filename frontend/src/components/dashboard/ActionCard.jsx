import React from 'react'
import PropTypes from 'prop-types'
import { Link } from 'react-router-dom'
import { CCard, CCardBody } from '@coreui/react'

const ActionCard = ({ card, title, description }) => (
  <Link to={card.to} className="portal-card-link" id={`portal-card-${card.id}`}>
    <CCard className="portal-card border-0 h-100">
      <CCardBody className="portal-card-body">
        <span className="portal-card-icon-wrapper" aria-hidden="true">
          {card.icon}
        </span>
        <span className="portal-card-copy">
          <span className="portal-card-title">{title}</span>
          <span className="portal-card-description">{description}</span>
        </span>
      </CCardBody>
    </CCard>
  </Link>
)

ActionCard.propTypes = {
  card: PropTypes.shape({
    id: PropTypes.string.isRequired,
    to: PropTypes.string.isRequired,
    icon: PropTypes.node.isRequired,
  }).isRequired,
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
}

export default ActionCard
