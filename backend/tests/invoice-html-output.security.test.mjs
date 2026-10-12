import assert from 'node:assert/strict';
import test from 'node:test';
import { buildInvoiceHtml } from '../src/routes/public.routes.js';
import { PlatformInvoiceService } from '../src/features/platformInvoice/platformInvoice.service.js';

const payload = '<img src=x onerror=alert(1)>';

test('public invoice HTML encodes CRM and quote fields before rendering', () => {
  const html = buildInvoiceHtml({
    invoiceNumber: payload,
    organizationName: payload,
    contactName: payload,
    email: 'person@example.test',
    contactPhone: payload,
    amount: payload,
    paymentDetails: { paymentMethod: payload, transactionId: payload },
    breakdown: {
      planName: payload,
      selectedAddOns: [payload, { name: payload }],
    },
  });

  assert.doesNotMatch(html, /<img src=x onerror=alert\(1\)>/);
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.match(html, /₹0 INR/);
});

test('platform invoice HTML encodes stored customer and invoice fields before rendering', async () => {
  const service = new PlatformInvoiceService();
  service.getInvoiceById = async () => ({
    _id: payload,
    invoiceNumber: payload,
    status: payload,
    totalAmount: payload,
    subtotal: payload,
    vatAmount: payload,
    amountPaid: payload,
    amountOutstanding: payload,
    commercialSnapshot: { organizationName: payload, planName: payload },
    invoiceDate: '2026-01-01T00:00:00.000Z',
  });

  const html = await service.generateInvoiceHtml('ignored');

  assert.doesNotMatch(html, /<img src=x onerror=alert\(1\)>/);
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.match(html, /₹0 INR/);
});
