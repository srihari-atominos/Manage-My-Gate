import React from 'react'
import { Link } from 'react-router-dom'
import { CFooter } from '@coreui/react'

const AppFooter = () => {
  return (
    <CFooter className="px-4 py-2 flex-wrap gap-2">
      <div>
        <span className="fw-semibold text-primary">Manage My Gate</span>
        <span className="ms-1">
          &copy; {new Date().getFullYear()} Atominos Consulting Private Limited.
        </span>
      </div>
      <div className="ms-auto d-flex align-items-center gap-3 small">
        <Link to="/privacy-policy" className="text-decoration-none text-body-secondary">
          Privacy Policy
        </Link>
        <Link to="/terms-and-conditions" className="text-decoration-none text-body-secondary">
          Terms &amp; Conditions
        </Link>
        <Link to="/support" className="text-decoration-none text-body-secondary">
          Contact &amp; Support
        </Link>
        <Link to="/delete-account" className="text-decoration-none text-body-secondary">
          Account Deletion
        </Link>
      </div>
    </CFooter>
  )
}

export default React.memo(AppFooter)
