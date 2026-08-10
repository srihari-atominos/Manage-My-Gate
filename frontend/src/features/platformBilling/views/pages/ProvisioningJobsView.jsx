import React from 'react';
import { usePlatformBilling } from "../../hooks/usePlatformBilling.js";

const ProvisioningJobsView = () => {
  const { jobs } = usePlatformBilling();

  return (
    <section className="page">
      <div className="page-head">
        <div>
          <h1>Automated Provisioning Jobs</h1>
          <div className="sub">State machine tracker supporting trial auto-provisioning.</div>
        </div>
      </div>
      <div className="panel panel-body table-responsive">
        <table className="table">
          <thead>
            <tr>
              <th>Job ID</th>
              <th>Target Organization</th>
              <th>Trigger Source</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((item) => (
              <tr key={item._id || item.id}>
                <td>{item.jobId || item._id}</td>
                <td>{item.targetOrganizationId?.name || item.targetOrganizationId || item.org}</td>
                <td>{item.triggerSource || item.sourceOrderId || item.trigger}</td>
                <td><span className="badge green">{item.status}</span></td>
                <td>
                  <button className="btn small" disabled={item.status === 'IN_PROGRESS'}>
                    {item.status === 'IN_PROGRESS' ? 'Processing...' : 'View Logs'}
                  </button>
                </td>
              </tr>
            ))}
            {jobs.length === 0 && (
              <tr><td colSpan="5">No jobs found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default ProvisioningJobsView;
