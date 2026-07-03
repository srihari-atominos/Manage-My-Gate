import React from 'react'
import { CFooter } from '@coreui/react'

const AppFooter = () => {
  return (
    <CFooter className="px-4">
      <div>
        <span className="fw-semibold text-primary">Manage My Gate</span>
        <span className="ms-1">&copy; {new Date().getFullYear()} Atominos Consulting.</span>
      </div>
      <div className="ms-auto">
        <span className="me-1">Secure Operations Portal</span>
      </div>
    </CFooter>
  )
}

export default React.memo(AppFooter)
