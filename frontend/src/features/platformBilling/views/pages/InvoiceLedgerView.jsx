import React, { useState } from 'react';
import { usePlatformBilling } from "../../hooks/usePlatformBilling.js";
import { toast } from 'react-hot-toast';

const InvoiceLedgerView = () => {
  const { invoices, downloadPdf } = usePlatformBilling();
  const [downloadingId, setDownloadingId] = useState(null);

  const handleDownloadPDF = async (invoiceId) => {
    try {
      setDownloadingId(invoiceId);
      // Trigger backend Puppeteer rendering engine with Arabic RTL layout parameters
      const response = await downloadPdf(invoiceId);
      
      const url = window.URL.createObjectURL(new Blob([response]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Invoice_${invoiceId}_AR.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Arabic RTL PDF Downloaded Successfully');
    } catch (error) {
      toast.error('Failed to download invoice PDF');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <section className="page">
      <div className="page-head">
        <div>
          <h1>Platform Invoices (Ledger)</h1>
          <div className="sub">GST-compliant tax breakdowns auto-generated upon payment or trial completion.</div>
        </div>
      </div>

      <div className="panel panel-body table-responsive">
        <table className="table">
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Order Ref</th>
              <th>Organization</th>
              <th>Trial Status</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((item) => (
              <tr key={item._id || item.id}>
                <td>{item.invoiceNumber || item._id}</td>
                <td>{item.orderId?.orderNumber || item.orderId || item.order}</td>
                <td>{item.organizationName || item.organisationId?.name || item.organisationId || item.org}</td>
                <td>{item.trialStatus || (item.invoiceSnapshot?.trialDays > 0 ? `${item.invoiceSnapshot.trialDays} Days Trial` : 'No Trial')}</td>
                <td>
                  <span className={`badge ${item.status === 'PAID' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`} style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                    {item.status === 'UNPAID' ? 'PENDING' : item.status}
                  </span>
                </td>
                <td>
                  {item.status === 'PAID' ? (
                    <button 
                      onClick={() => handleDownloadPDF(item._id || item.id)}
                      className="btn small primary"
                      disabled={downloadingId === (item._id || item.id)}
                    >
                      {downloadingId === (item._id || item.id) ? 'Rendering PDF...' : 'Download Arabic PDF'}
                    </button>
                  ) : (
                    item.paymentLinkUrl ? (
                      <a href={item.paymentLinkUrl} target="_blank" rel="noopener noreferrer" className="btn small" style={{ border: '1px solid #ced4da', textDecoration: 'none', color: '#495057' }}>
                        View Payment Link
                      </a>
                    ) : (
                      <button className="btn small disabled" disabled>Pending...</button>
                    )
                  )}
                </td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr><td colSpan="6">No invoices found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default InvoiceLedgerView;
