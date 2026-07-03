import React, { useEffect, useState, memo } from 'react';
import { CSpinner } from '@coreui/react';
import dashboardApi from '../../services/dashboardApi.js';

const TrendsWidget = memo(() => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    dashboardApi.getTrends()
      .then(res => {
        if (isMounted) {
          setData(res.data || []);
          setLoading(false);
        }
      })
      .catch(err => {
        if (isMounted) {
          setError('Failed to load trends');
          setLoading(false);
        }
      });
    return () => { isMounted = false; };
  }, []);

  return (
    <div className="card">
      <h3 style={{ marginBottom: '24px' }}>Most Popular Amenities</h3>
      <div>
        {loading && <div className="text-center p-4"><CSpinner size="sm" /></div>}
        {error && <div className="text-danger p-4">{error}</div>}
        {!loading && !error && data.length === 0 && <div className="text-muted text-center p-4">No bookings yet</div>}
        {!loading && !error && data.length > 0 && (
          <ul style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {data.map(item => (
              <li key={item._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', borderBottom: '1px solid var(--border-light)' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{item.name}</span>
                <span className="badge badge-info">{item.count} bookings</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
});

export default TrendsWidget;
