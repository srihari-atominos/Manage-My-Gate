import React from 'react'
import { Link } from 'react-router-dom'

/**
 * Dashboard - Al Jazirah Vehicles Portal Hub
 *
 * Category-grid enterprise portal layout.
 * Each category section has a pipe-prefix header followed by a flex grid of
 * small, square, centered cards. Cards contain an icon wrapper + bold title only.
 */

// ─── Data: Category & Card Definitions ──────────────────────────────────────

const PORTAL_CATEGORIES = [
  {
    id: 'account-management',
    label: 'ACCOUNT MANAGEMENT',
    cards: [
      {
        id: 'users',
        title: 'Users',
        to: '/users',
        icon: (
          <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="1.75" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        ),
      },
      {
        id: 'roles',
        title: 'Roles',
        to: '/role-builder',
        icon: (
          <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="1.75" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        ),
      },
    ],
  },
  {
    id: 'settings',
    label: 'SETTINGS',
    cards: [
      {
        id: 'configuration',
        title: 'Configuration',
        to: '#',
        icon: (
          <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="1.75" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        ),
      },
      {
        id: 'audit-log',
        title: 'Audit Log',
        to: '#',
        icon: (
          <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="1.75" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        ),
      },
      {
        id: 'integrations',
        title: 'Integration Hub',
        to: '/integrations',
        icon: (
          <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="1.75" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="9" rx="1" />
            <rect x="14" y="3" width="7" height="5" rx="1" />
            <rect x="14" y="12" width="7" height="9" rx="1" />
            <rect x="3" y="16" width="7" height="5" rx="1" />
          </svg>
        ),
      },
    ],
  },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

/**
 * SectionHeader – renders the `| LABEL` pipe-prefix category header
 */
const SectionHeader = ({ label }) => (
  <div className="portal-section-header">
    <span className="portal-pipe" aria-hidden="true" />
    <span className="portal-section-label">{label}</span>
  </div>
)

/**
 * PortalCard – individual small, square, centered feature card
 */
const PortalCard = ({ card }) => (
  <Link to={card.to} className="portal-card-link" id={`portal-card-${card.id}`}>
    <div className="portal-card">
      <div className="portal-card-icon-wrapper">
        {card.icon}
      </div>
      <span className="portal-card-title">{card.title}</span>
    </div>
  </Link>
)

// ─── Main Component ───────────────────────────────────────────────────────────

const Dashboard = () => {
  return (
    <div className="portal-hub">
      <style>{`
        /* ── Hub Container ── */
        .portal-hub {
          padding: 2rem 2rem 4rem;
          max-width: 1100px;
          margin: 0 auto;
        }

        /* ── Main Title ── */
        .portal-main-title {
          font-size: 1.55rem;
          font-weight: 700;
          text-align: center;
          letter-spacing: -0.02em;
          color: var(--cui-body-color);
          margin-bottom: 2.75rem;
        }

        /* ── Category Section ── */
        .portal-category {
          margin-bottom: 2.25rem;
        }

        /* ── Section Header: | LABEL ── */
        .portal-section-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 1rem;
        }
        .portal-pipe {
          display: inline-block;
          width: 3px;
          height: 14px;
          border-radius: 2px;
          background: var(--cui-primary, #321fdb);
          flex-shrink: 0;
        }
        .portal-section-label {
          font-size: 0.65rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--cui-text-muted, #768192);
        }

        /* ── Card Grid ── */
        .portal-card-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
        }

        /* ── Card Link Reset ── */
        .portal-card-link {
          text-decoration: none;
          color: inherit;
          flex-shrink: 0;
        }

        /* ── Individual Card ── */
        .portal-card {
          width: 104px;
          height: 104px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
          border-radius: 14px;
          border: 1px solid rgba(0, 0, 0, 0.07);
          background: var(--cui-card-bg, #ffffff);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.025);
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
          cursor: pointer;
          padding: 0 12px;
        }
        .portal-card-link:hover .portal-card {
          transform: translateY(-3px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.06);
          border-color: var(--cui-primary, #321fdb);
        }
        [data-coreui-theme='dark'] .portal-card {
          border: 1px solid rgba(255, 255, 255, 0.06);
          background: rgba(255, 255, 255, 0.025);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
        }
        [data-coreui-theme='dark'] .portal-card-link:hover .portal-card {
          background: rgba(50, 31, 219, 0.08);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.25);
        }

        /* ── Icon Wrapper ── */
        .portal-card-icon-wrapper {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          background: rgba(50, 31, 219, 0.06);
          color: var(--cui-primary, #321fdb);
          transition: background 0.2s ease, color 0.2s ease;
          flex-shrink: 0;
        }
        .portal-card-link:hover .portal-card-icon-wrapper {
          background: var(--cui-primary, #321fdb);
          color: #ffffff;
        }

        /* ── Card Title ── */
        .portal-card-title {
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.01em;
          color: var(--cui-body-color);
          text-align: center;
          line-height: 1.2;
        }

        /* ── Responsive ── */
        @media (max-width: 576px) {
          .portal-hub {
            padding: 1.25rem 1rem 3rem;
          }
          .portal-main-title {
            font-size: 1.2rem;
            margin-bottom: 2rem;
          }
          .portal-card {
            width: 92px;
            height: 92px;
          }
        }
      `}</style>

      {/* Main Portal Title */}
      <h1 className="portal-main-title">
        Welcome to {import.meta.env.VITE_APP_NAME || 'Portal'}
      </h1>

      {/* Category Sections */}
      {PORTAL_CATEGORIES.map((category) => (
        <section key={category.id} className="portal-category" aria-labelledby={`section-${category.id}`}>
          <SectionHeader label={category.label} />
          <div className="portal-card-grid" id={`section-${category.id}`}>
            {category.cards.map((card) => (
              <PortalCard key={card.id} card={card} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

export default Dashboard
