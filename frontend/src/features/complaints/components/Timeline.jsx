import React from 'react'

const Timeline = ({ events }) => {
  if (!events || events.length === 0) {
    return <p className="text-muted">No timeline events yet.</p>
  }

  return (
    <div className="timeline-container">
      {events.map((evt, index) => (
        <div key={index} className="timeline-event">
          <div className="timeline-dot"></div>
          <div className="timeline-content">
            <div className="meta">
              {evt.action} • {new Date(evt.date).toLocaleString()}
              {evt.userName && ` by ${evt.userName} (${evt.userRole})`}
            </div>
            {evt.remarks && <div className="text">{evt.remarks}</div>}

            {evt.attachments && evt.attachments.length > 0 && (
              <div style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {evt.attachments.map((url, i) => (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'var(--primary)' }}
                    className="small"
                  >
                    <i className="fa-solid fa-paperclip"></i> Attachment {i + 1}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

export default Timeline
