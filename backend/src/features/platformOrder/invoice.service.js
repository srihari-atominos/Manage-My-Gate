import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import logger from '../../utils/logger.utils.js';
import PlatformOrder from './platformOrder.model.js';

class InvoiceService {
  /**
   * Generate PDF Invoice and save locally, updating the Order with the path
   */
  async generateInvoice(orderId, orderDetails) {
    try {
      const { invoiceId, date, billingCycle, subtotal, taxAmount, grandTotal, organizationName } = orderDetails;
      
      const invoiceDir = path.join(process.cwd(), 'public', 'invoices');
      if (!fs.existsSync(invoiceDir)) {
        fs.mkdirSync(invoiceDir, { recursive: true });
      }

      const fileName = `Invoice_${invoiceId}.pdf`;
      const filePath = path.join(invoiceDir, fileName);
      
      return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50 });
        const stream = fs.createWriteStream(filePath);
        
        doc.pipe(stream);

        // Header
        doc.fontSize(20).text('TAX INVOICE', { align: 'center' });
        doc.moveDown();
        
        // Company Info
        doc.fontSize(12).text('Atominos Consulting Private Limited');
        doc.text('123 Tech Park, Bangalore, India');
        doc.text('GSTIN: 29XXXXXXXXXXXXX');
        doc.moveDown();

        // Customer Info
        doc.text(`Bill To: ${organizationName}`);
        doc.text(`Invoice ID: ${invoiceId}`);
        doc.text(`Order ID: ${orderId}`);
        doc.text(`Date: ${date}`);
        doc.text(`Billing Cycle: ${billingCycle}`);
        doc.moveDown(2);

        // Line Items
        doc.text('Description', 50, doc.y);
        doc.text('Amount (SAR)', 400, doc.y, { align: 'right' });
        doc.moveTo(50, doc.y + 10).lineTo(500, doc.y + 10).stroke();
        doc.moveDown();

        doc.text(`Subscription Renewal - ${billingCycle}`, 50, doc.y);
        doc.text(`${Number(subtotal).toFixed(2)}`, 400, doc.y, { align: 'right' });
        doc.moveDown();

        // Totals
        doc.moveTo(50, doc.y).lineTo(500, doc.y).stroke();
        doc.moveDown();
        
        doc.text('Subtotal:', 300, doc.y);
        doc.text(`${Number(subtotal).toFixed(2)}`, 400, doc.y, { align: 'right' });
        doc.moveDown(0.5);

        doc.text('GST (15%):', 300, doc.y);
        doc.text(`${Number(taxAmount).toFixed(2)}`, 400, doc.y, { align: 'right' });
        doc.moveDown(0.5);

        doc.font('Helvetica-Bold');
        doc.text('Grand Total:', 300, doc.y);
        doc.text(`${Number(grandTotal).toFixed(2)}`, 400, doc.y, { align: 'right' });
        
        // Footer
        doc.moveDown(4);
        doc.font('Helvetica').fontSize(10).text('This is a computer-generated invoice and does not require a physical signature.', { align: 'center' });

        doc.end();

        stream.on('finish', async () => {
          logger.info(`Invoice generated successfully at ${filePath}`);
          try {
            const publicPath = `/invoices/${fileName}`;
            await PlatformOrder.findByIdAndUpdate(orderId, { invoiceUrl: publicPath });
            resolve({ filePath, publicPath });
          } catch (updateError) {
            logger.error(`Error updating PlatformOrder with invoice URL:`, updateError);
            reject(updateError);
          }
        });

        stream.on('error', (err) => {
          logger.error('Error writing PDF stream:', err);
          reject(err);
        });
      });
    } catch (error) {
      logger.error('Error generating invoice:', error);
      throw error;
    }
  }
}

export default new InvoiceService();
