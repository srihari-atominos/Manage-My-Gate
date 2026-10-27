import express from 'express';
import rateLimit from 'express-rate-limit';
import logger from '../../utils/logger.utils.js';
import { verifyPayToken, ensureFreshPaymentLink, publicBaseUrl } from './invoicePayLink.service.js';

import { createRateLimitStore } from '../../middlewares/rateLimiter.middleware.js';

/**
 * Public (no login) "Pay online" endpoint used by invoice emails / WhatsApp.
 * GET /api/billing-links/:token/pay -> 302 to a Razorpay link for the CURRENT outstanding amount,
 * or a small status page when the invoice is paid / under review / the link is invalid.
 */
const router = express.Router();

const payLinkLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  store: createRateLimitStore('paylink'),
  passOnStoreError: process.env.REQUIRE_REDIS_RATE_LIMIT !== 'true',
  keyGenerator: (req) => `paylink:${req.params?.token || req.ip}`,
  validate: { xForwardedForHeader: false, default: true, keyGeneratorIpFallback: false },
});

const escapeHtml = (v) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const renderStatusPage = ({ title, message, invoiceId }) => {
  const appLink = invoiceId ? `${publicBaseUrl()}/billing/invoice/${encodeURIComponent(invoiceId)}` : publicBaseUrl();
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>body{margin:0;font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#f6f4f1;color:#1c1917;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:16px}
.card{background:#fff;border-radius:20px;padding:28px;max-width:420px;width:100%;box-shadow:0 4px 24px rgba(0,0,0,.06);text-align:center}
h1{font-size:20px;margin:0 0 8px}p{color:#57534e;line-height:1.5;margin:0 0 20px}
a{display:inline-block;background:#ea580c;color:#fff;text-decoration:none;padding:12px 20px;border-radius:12px;font-weight:600}</style></head>
<body><div class="card"><h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p><a href="${escapeHtml(appLink)}">Open in the app</a></div></body></html>`;
};

router.get('/:token/pay', payLinkLimiter, async (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.set('Referrer-Policy', 'no-referrer');
  const claims = verifyPayToken(req.params.token);
  if (!claims) {
    return res.status(410).type('html').send(renderStatusPage({
      title: 'This payment link has expired',
      message: 'Open the app to see your latest dues and pay securely.',
    }));
  }

  try {
    const result = await ensureFreshPaymentLink(claims.invoiceId);
    if (result.state === 'ACTIVE' && result.url) return res.redirect(302, result.url);

    const pages = {
      PAID: ['This invoice is already paid', 'Thank you - no payment is due. Your receipt is in the app.'],
      VERIFICATION_PENDING: ['Payment under review', 'A bank transfer for this invoice is being verified by your community. No further payment is needed right now.'],
      CARRIED_FORWARD: ['This balance is part of a newer invoice', 'Open the app and pay your latest invoice - it already includes this amount.'],
      CANCELLED: ['This invoice was cancelled', 'No payment is due. Contact your community office if you have questions.'],
      NOT_FOUND: ['Invoice not found', 'Open the app to see your latest dues.'],
    };
    const [title, message] = pages[result.state] || pages.NOT_FOUND;
    return res.status(result.state === 'NOT_FOUND' ? 404 : 200).type('html').send(renderStatusPage({ title, message, invoiceId: claims.invoiceId }));
  } catch (error) {
    logger.error('Pay-online link failed', { invoiceId: claims.invoiceId, error: error.message });
    return res.status(502).type('html').send(renderStatusPage({
      title: 'Online payment is unavailable right now',
      message: 'Please try again in a few minutes, or pay from the app.',
      invoiceId: claims.invoiceId,
    }));
  }
});

router.get('/invoice/:id', async (req, res) => {
  const invoiceId = req.params.id;
  const token = req.query.t;
  const Invoice = (await import('./invoice.model.js')).default;
  const invoice = await Invoice.findById(invoiceId).catch(() => null);

  const payUrl = token ? `/api/billing-links/${encodeURIComponent(token)}/pay` : '#';
  const customSchemeUrl = `managemygate://billing/invoice/${encodeURIComponent(invoiceId)}`;
  const androidIntentUrl = `intent://billing/invoice/${encodeURIComponent(invoiceId)}#Intent;scheme=managemygate;package=com.atominosconsulting.nahom;end`;
  const universalUrl = `https://managemygate.e3esg.com/billing/invoice/${encodeURIComponent(invoiceId)}${token ? `?t=${encodeURIComponent(token)}` : ''}`;
  const playStoreUrl = 'https://play.google.com/store/apps/details?id=com.atominosconsulting.nahom';
  const appStoreUrl = 'https://apps.apple.com/app/manage-my-gate/id6746501635';

  const title = invoice ? `Invoice #${invoice.invoiceNumber || invoice._id}` : 'Your Invoice';
  const amount = invoice
    ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: invoice.currency || 'INR' }).format(
        invoice.totalAmount || invoice.totalDue || 0
      )
    : '₹0.00';
  const period = invoice?.billingPeriodString || 'Current Period';

  // QR Code pointing to universal invoice URL for phone camera scanning
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(universalUrl)}`;

  res.type('html').send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background: #f6f4f1;
      color: #1c1917;
      display: flex;
      min-height: 100vh;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .card {
      background: #ffffff;
      border-radius: 24px;
      padding: 32px 28px;
      max-width: 440px;
      width: 100%;
      box-shadow: 0 10px 30px rgba(0,0,0,0.06);
      text-align: center;
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      background: #fed7aa;
      color: #9a3412;
      border-radius: 12px;
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 12px;
    }
    h1 {
      font-size: 24px;
      font-weight: 700;
      margin: 0 0 8px;
      color: #1c1917;
    }
    .amount {
      font-size: 32px;
      font-weight: 800;
      color: #ea580c;
      margin: 12px 0 6px;
    }
    .period {
      font-size: 14px;
      color: #78716c;
      margin-bottom: 24px;
    }
    .btn {
      display: block;
      width: 100%;
      padding: 14px 20px;
      border-radius: 14px;
      font-weight: 600;
      font-size: 16px;
      text-decoration: none;
      cursor: pointer;
      border: none;
      transition: all 0.2s ease;
      margin-bottom: 12px;
    }
    .btn-primary {
      background: #ea580c;
      color: #ffffff;
    }
    .btn-primary:hover {
      background: #c2410c;
    }
    .btn-outline {
      background: #ffffff;
      color: #ea580c;
      border: 1.5px solid #fdba74;
    }
    .btn-outline:hover {
      background: #fff7ed;
    }
    .desktop-panel {
      display: none;
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px dashed #e7e5e4;
      text-align: center;
    }
    .desktop-panel h3 {
      font-size: 15px;
      margin: 0 0 6px;
      color: #292524;
    }
    .desktop-panel p {
      font-size: 13px;
      color: #78716c;
      margin: 0 0 16px;
      line-height: 1.4;
    }
    .qr-box {
      background: #fafaf9;
      padding: 12px;
      display: inline-block;
      border-radius: 16px;
      border: 1px solid #e7e5e4;
      margin-bottom: 12px;
    }
    .qr-box img {
      display: block;
      width: 140px;
      height: 140px;
      border-radius: 8px;
    }
    .store-links {
      display: flex;
      justify-content: center;
      gap: 12px;
      margin-top: 8px;
    }
    .store-link {
      font-size: 12px;
      color: #ea580c;
      text-decoration: none;
      font-weight: 600;
    }
    .footer-note {
      font-size: 12px;
      color: #a8a29e;
      margin-top: 18px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">Billing Notification</div>
    <h1>${escapeHtml(title)}</h1>
    <div class="amount">${escapeHtml(amount)}</div>
    <div class="period">Billing Period: ${escapeHtml(period)}</div>

    <a class="btn btn-primary" href="${escapeHtml(payUrl)}">
      Pay Online Now
    </a>

    <button id="openAppBtn" class="btn btn-outline" type="button">
      Open in Mobile App
    </button>

    <div id="desktopPanel" class="desktop-panel">
      <h3>Scan to Open on Your Phone</h3>
      <p>The Nahom app is designed for iOS &amp; Android. Point your phone camera at the QR code below:</p>
      <div class="qr-box">
        <img src="${escapeHtml(qrCodeUrl)}" alt="Scan to open on mobile" />
      </div>
      <div class="store-links">
        <a class="store-link" href="${escapeHtml(playStoreUrl)}" target="_blank">Google Play</a>
        <span>&bull;</span>
        <a class="store-link" href="${escapeHtml(appStoreUrl)}" target="_blank">Apple App Store</a>
      </div>
    </div>

    <div class="footer-note">
      Payments are secured and processed directly via payment gateway.
    </div>
  </div>

  <script>
    (function() {
      var isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      var openBtn = document.getElementById('openAppBtn');
      var desktopPanel = document.getElementById('desktopPanel');
      var customScheme = ${JSON.stringify(customSchemeUrl)};
      var androidIntent = ${JSON.stringify(androidIntentUrl)};

      openBtn.addEventListener('click', function(e) {
        e.preventDefault();
        if (isMobile) {
          // On mobile device: attempt to launch the app via native URI scheme / Intent
          var isAndroid = /Android/i.test(navigator.userAgent);
          var targetUrl = isAndroid ? androidIntent : customScheme;
          
          window.location.href = targetUrl;

          // If app is not installed, prompt store fallback after 1.5s
          setTimeout(function() {
            if (!document.hidden) {
              if (confirm('Nahom app not installed or did not open. Would you like to install it or pay online?')) {
                window.location.href = isAndroid ? ${JSON.stringify(playStoreUrl)} : ${JSON.stringify(appStoreUrl)};
              }
            }
          }, 1600);
        } else {
          // On Desktop PC (Windows/Mac/Linux):
          // Toggle the QR Code and Mobile Access Panel with clear instructions
          if (desktopPanel.style.display === 'block') {
            desktopPanel.style.display = 'none';
          } else {
            desktopPanel.style.display = 'block';
            desktopPanel.scrollIntoView({ behavior: 'smooth' });
          }
        }
      });

      // If user is on a desktop computer, automatically expand the helpful QR helper
      if (!isMobile) {
        desktopPanel.style.display = 'block';
      }
    })();
  </script>
</body>
</html>`);
});

export default router;
