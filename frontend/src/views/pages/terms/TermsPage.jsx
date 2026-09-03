import React, { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { CContainer, CRow, CCol, CCard, CCardBody, CButton, CBadge } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilFile, cilArrowLeft, cilShieldAlt } from '@coreui/icons'

/**
 * Terms & Conditions Page Component for Nahom / ManageMyGate
 *
 * Dedicated public legal terms of service for Atominos Consulting Private Limited.
 */
const TermsPage = () => {
  useEffect(() => {
    document.title = 'Terms & Conditions - Nahom'

    // Set meta description
    let metaDesc = document.querySelector('meta[name="description"]')
    if (!metaDesc) {
      metaDesc = document.createElement('meta')
      metaDesc.name = 'description'
      document.head.appendChild(metaDesc)
    }
    metaDesc.content =
      'Terms & Conditions for the Nahom application provided by Atominos Consulting Private Limited.'

    // Set canonical link
    let canonical = document.querySelector('link[rel="canonical"]')
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.rel = 'canonical'
      document.head.appendChild(canonical)
    }
    canonical.href = 'https://managemygate.e3esg.com/terms'
  }, [])

  return (
    <div className="min-vh-100 bg-body-tertiary d-flex flex-column">
      {/* Public Header Bar */}
      <header className="bg-body border-bottom py-3 shadow-sm sticky-top">
        <CContainer className="d-flex justify-content-between align-items-center">
          <Link to="/" className="text-decoration-none d-flex align-items-center gap-2">
            <CIcon icon={cilShieldAlt} size="xl" className="text-primary" />
            <span className="fw-bold fs-5 text-body">Manage My Gate</span>
          </Link>
          <Link to="/login">
            <CButton color="primary" variant="outline" size="sm">
              Sign In
            </CButton>
          </Link>
        </CContainer>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow-1 py-4 py-md-5">
        <CContainer>
          <CRow className="justify-content-center">
            <CCol lg={10} xl={9}>
              <CCard className="border-0 shadow-sm mb-4">
                <CCardBody className="p-4 p-md-5">
                  {/* Hero Header */}
                  <div className="border-bottom pb-4 mb-4">
                    <div className="d-flex align-items-center gap-2 text-primary mb-2">
                      <CIcon icon={cilFile} size="lg" />
                      <span className="fw-semibold text-uppercase small tracking-wide">
                        Legal & Terms of Service
                      </span>
                    </div>
                    <h1 className="fw-extrabold display-6 mb-2">Terms &amp; Conditions</h1>
                    <p className="text-body-secondary mb-3">
                      Nahom Application &bull; Platform: ManageMyGate
                    </p>
                    <div className="d-flex flex-wrap gap-3 align-items-center text-body-secondary small">
                      <CBadge color="primary" className="px-2 py-1">
                        Version 1.0.0
                      </CBadge>
                      <span>
                        <strong>Effective Date:</strong> September 3, 2026
                      </span>
                      <span>&bull;</span>
                      <span>
                        <strong>Last Updated:</strong> September 3, 2026
                      </span>
                    </div>
                  </div>

                  {/* Section 1: Acceptance of Terms */}
                  <section className="mb-5">
                    <h2 className="h4 fw-bold text-body mb-3">1. Acceptance of Terms</h2>
                    <p>
                      These Terms &amp; Conditions (&quot;Terms&quot;) govern your access to and use
                      of the <strong>Nahom</strong> mobile application and the{' '}
                      <strong>ManageMyGate</strong> web portal located at{' '}
                      <a
                        href="https://managemygate.e3esg.com"
                        target="_blank"
                        rel="noreferrer"
                        className="text-decoration-none"
                      >
                        https://managemygate.e3esg.com
                      </a>
                      , operated by <strong>Atominos Consulting Private Limited</strong>{' '}
                      (&quot;Company&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;).
                    </p>
                    <p>
                      By creating an account, accessing, or using Nahom or ManageMyGate services,
                      you agree to be legally bound by these Terms. If you do not agree to these
                      Terms, you may not access or use the application.
                    </p>
                  </section>

                  {/* Section 2: Eligibility & Account Security */}
                  <section className="mb-5">
                    <h2 className="h4 fw-bold text-body mb-3">
                      2. Eligibility &amp; Account Responsibilities
                    </h2>
                    <ul>
                      <li>
                        <strong>Authorized Access:</strong> You must be an authorized property
                        owner, resident, tenant, community administrator, or security staff member
                        registered with your community association to use the platform.
                      </li>
                      <li>
                        <strong>Account Accuracy:</strong> You agree to provide accurate, current,
                        and complete registration information during account setup and profile
                        updates.
                      </li>
                      <li>
                        <strong>Credential Security:</strong> You are responsible for maintaining
                        the confidentiality of your login credentials and for all activities
                        conducted under your account. You must notify us immediately of any
                        unauthorized account access.
                      </li>
                    </ul>
                  </section>

                  {/* Section 3: Community & Security Rules */}
                  <section className="mb-5">
                    <h2 className="h4 fw-bold text-body mb-3">
                      3. Community &amp; Gate Security Rules
                    </h2>
                    <ul>
                      <li>
                        <strong>Visitor Pass Generation:</strong> Residents are responsible for
                        issuing visitor passes accurately. Misuse of visitor passes or providing
                        false visitor details is strictly prohibited.
                      </li>
                      <li>
                        <strong>Gate Verification:</strong> Security personnel verify visitor passes
                        at community entry points. Gate entry decisions remain subject to community
                        association guidelines and security protocol.
                      </li>
                      <li>
                        <strong>Amenity Bookings:</strong> Amenity bookings are subject to
                        availability, community guidelines, and association rules. Facilities must
                        be used respectfully and in accordance with scheduled time slots.
                      </li>
                    </ul>
                  </section>

                  {/* Section 4: Maintenance Complaints & Content */}
                  <section className="mb-5">
                    <h2 className="h4 fw-bold text-body mb-3">
                      4. Maintenance Complaints &amp; User Content
                    </h2>
                    <p>
                      When submitting maintenance complaints, community posts, or uploading photo
                      attachments:
                    </p>
                    <ul>
                      <li>
                        You guarantee that submitted content is accurate, lawful, and relevant to
                        community operations.
                      </li>
                      <li>
                        You must not upload defamatory, offensive, abusive, or infringing material.
                      </li>
                      <li>
                        We reserve the right to moderate, flag, or remove content violating
                        community rules or platform guidelines.
                      </li>
                    </ul>
                  </section>

                  {/* Section 5: Billing & Payments */}
                  <section className="mb-5">
                    <h2 className="h4 fw-bold text-body mb-3">5. Billing &amp; Payments</h2>
                    <p>
                      Maintenance fees, dues, and amenity booking charges are established by your
                      community association or platform subscription agreement. All online
                      transactions are processed securely via third-party payment gateways. Payment
                      receipts and invoice statements are generated for tracking and accounting
                      compliance.
                    </p>
                  </section>

                  {/* Section 6: Prohibited Activities */}
                  <section className="mb-5">
                    <h2 className="h4 fw-bold text-body mb-3">6. Prohibited Activities</h2>
                    <p>You agree not to engage in any of the following prohibited actions:</p>
                    <ul>
                      <li>
                        Attempting to bypass platform security, authentication controls, or
                        multi-tenant workspace boundaries.
                      </li>
                      <li>
                        Reverse engineering, decompiling, or attempting to extract source code from
                        the mobile application or web portal.
                      </li>
                      <li>
                        Using automated bots, scrapers, or scripts to access or extract platform
                        data.
                      </li>
                      <li>Impersonating another resident, gate guard, or administrator.</li>
                    </ul>
                  </section>

                  {/* Section 7: Intellectual Property */}
                  <section className="mb-5">
                    <h2 className="h4 fw-bold text-body mb-3">7. Intellectual Property</h2>
                    <p>
                      The Nahom application, ManageMyGate platform, software design, trademarks,
                      logos, brand assets, and interface elements are the exclusive intellectual
                      property of <strong>Atominos Consulting Private Limited</strong>. Nothing in
                      these Terms grants you ownership rights to the platform or underlying code.
                    </p>
                  </section>

                  {/* Section 8: Account Termination & Deletion */}
                  <section className="mb-5">
                    <h2 className="h4 fw-bold text-body mb-3">
                      8. Account Termination &amp; Deletion
                    </h2>
                    <p>
                      You may terminate your account at any time via the in-app deletion option or
                      by submitting an Account Deletion Request at{' '}
                      <Link to="/delete-account" className="text-decoration-none fw-semibold">
                        https://managemygate.e3esg.com/delete-account
                      </Link>
                      .
                    </p>
                    <p>
                      We reserve the right to suspend or terminate accounts that violate community
                      rules, engage in fraudulent activity, or compromise platform security.
                    </p>
                  </section>

                  {/* Section 9: Limitation of Liability */}
                  <section className="mb-5">
                    <h2 className="h4 fw-bold text-body mb-3">9. Limitation of Liability</h2>
                    <p>
                      To the maximum extent permitted by applicable law, Atominos Consulting Private
                      Limited shall not be liable for indirect, incidental, consequential, or
                      punitive damages resulting from your use or inability to use the platform,
                      gate delays, or third-party service disruptions.
                    </p>
                  </section>

                  {/* Section 10: Governing Law & Jurisdiction */}
                  <section className="mb-5">
                    <h2 className="h4 fw-bold text-body mb-3">
                      10. Governing Law &amp; Jurisdiction
                    </h2>
                    <p>
                      These Terms &amp; Conditions shall be governed by and construed in accordance
                      with the laws of India [TODO: Legal jurisdiction confirmation by project
                      owner]. Any disputes arising under these Terms shall be subject to the
                      jurisdiction of the competent courts.
                    </p>
                  </section>

                  {/* Section 11: Contact Information */}
                  <section className="mb-4">
                    <h2 className="h4 fw-bold text-body mb-3">11. Contact Information</h2>
                    <p>
                      For questions or inquiries regarding these Terms &amp; Conditions, please
                      contact us:
                    </p>
                    <div className="p-3 bg-body-secondary rounded-3 border">
                      <p className="mb-1">
                        <strong>Atominos Consulting Private Limited</strong>
                      </p>
                      <p className="mb-1">
                        General Support:{' '}
                        <a
                          href="mailto:mohanraj@atominosconsulting.com"
                          className="text-decoration-none"
                        >
                          mohanraj@atominosconsulting.com
                        </a>
                      </p>
                      <p className="mb-0">
                        Privacy &amp; Compliance:{' '}
                        <a
                          href="mailto:info@atominosconsulting.com"
                          className="text-decoration-none"
                        >
                          info@atominosconsulting.com
                        </a>
                      </p>
                    </div>
                  </section>
                </CCardBody>
              </CCard>

              {/* Navigation Action */}
              <div className="text-center mb-5">
                <Link to="/">
                  <CButton color="secondary" variant="ghost">
                    <CIcon icon={cilArrowLeft} className="me-2" />
                    Back to ManageMyGate Portal
                  </CButton>
                </Link>
              </div>
            </CCol>
          </CRow>
        </CContainer>
      </main>

      {/* Public Page Footer */}
      <footer className="bg-body border-top py-3 mt-auto">
        <CContainer className="d-flex flex-wrap justify-content-between align-items-center small text-body-secondary gap-2">
          <div>
            <strong>Manage My Gate</strong> &copy; {new Date().getFullYear()} Atominos Consulting
            Private Limited.
          </div>
          <div className="d-flex align-items-center gap-3">
            <Link to="/privacy-policy" className="text-decoration-none text-body-secondary">
              Privacy Policy
            </Link>
            <Link to="/terms" className="text-decoration-none text-body-secondary">
              Terms &amp; Conditions
            </Link>
            <Link to="/delete-account" className="text-decoration-none text-body-secondary">
              Account Deletion
            </Link>
          </div>
        </CContainer>
      </footer>
    </div>
  )
}

export default TermsPage
