import React, { useState } from 'react';

const ComplaintReports = () => {
  const [dateRange, setDateRange] = useState('This Month');
  const [reportType, setReportType] = useState('SLA Performance');

  return (
    <>
      <div className="page-header">
        <h1 id="pageTitle">Reports & Exports</h1>
        <div className="sub" id="pageSub">Generate custom reports for management review</div>
      </div>
      
      <div className="content">
        <section className="screen active" id="reports">
          <div className="card" style={{ maxWidth: '600px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--ink)', marginBottom: '20px' }}>Generate New Report</h3>
            
            <div className="form-group">
              <label>Report Type</label>
              <select value={reportType} onChange={e => setReportType(e.target.value)}>
                <option>SLA Performance</option>
                <option>Resolution Times</option>
                <option>Technician Workload</option>
                <option>Category Breakdown</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>Date Range</label>
              <select value={dateRange} onChange={e => setDateRange(e.target.value)}>
                <option>This Week</option>
                <option>This Month</option>
                <option>Last Quarter</option>
                <option>Year to Date</option>
                <option>Custom Range</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>Format</label>
              <div className="radio-group" style={{ border: 'none', padding: 0 }}>
                <label className="radio-label">
                  <input type="radio" name="format" defaultChecked /> CSV / Excel
                </label>
                <label className="radio-label">
                  <input type="radio" name="format" /> PDF Document
                </label>
              </div>
            </div>
            
            <div style={{ marginTop: '32px', display: 'flex', gap: '16px' }}>
              <button className="btn btn-primary" onClick={() => alert('Downloading report...')}>
                <i className="fa-solid fa-download"></i> Download Report
              </button>
              <button className="btn btn-ghost" onClick={() => alert('Sending report to email...')}>
                <i className="fa-solid fa-envelope"></i> Email to Me
              </button>
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default ComplaintReports;
