const fs = require('fs');
const path = require('path');

const files = [
  'backend/src/config/config.js',
  'backend/src/features/auth/auth.listeners.js',
  'backend/src/features/auth/auth.services.js',
  'backend/src/features/invoice/invoicePayLink.service.js',
  'backend/src/features/platformCrm/enquiry.listeners.js',
  'backend/src/features/platformInvoice/platformInvoice.service.js',
  'backend/src/features/platformPayment/platformPayment.service.js',
  'backend/src/features/platformQuote/platformQuote.service.js',
  'backend/src/features/user/utils/invite.utils.js',
  'backend/src/routes/public.routes.js',
  'frontend/src/config/config.js',
  'frontend/src/features/auth/views/Login.jsx',
  'frontend/src/features/billing/components/PaymentCheckoutModal.jsx',
  'frontend/src/features/billing/utils/invoiceTemplate.js',
  'frontend/src/features/platformBilling/components/tabs/PaymentTab.jsx',
  'frontend/src/layout/Sidebar.jsx',
  'frontend/src/views/pages/billing/BillingInvoiceLinkPage.jsx',
  'frontend/src/views/pages/contact/ContactSupportPage.jsx',
  'frontend/src/views/pages/deleteAccount/DeleteAccountPage.jsx',
  'frontend/src/views/pages/invite/InviteHandler.jsx',
  'frontend/src/views/pages/pay/PublicCheckoutPage.jsx',
  'frontend/src/views/pages/privacyPolicy/PrivacyPolicyPage.jsx',
  'frontend/src/views/pages/terms/TermsPage.jsx',
  'mobile/mobile-app/app.json',
  'mobile/mobile-app/app/(auth)/register.tsx',
  'mobile/mobile-app/app/(resident)/settings/index.tsx',
  'mobile/mobile-app/app/_layout.tsx',
  'mobile/mobile-app/components/feedback/ErrorBanner.tsx',
  'mobile/mobile-app/components/ui/ScreenShell.tsx',
  'mobile/mobile-app/src/features/auth/components/MicrosoftSignInButton.tsx',
  'mobile/mobile-app/src/features/billing/utils/invoicePdfUtility.ts',
  'mobile/mobile-app/src/features/noticeBoard/components/PollPostCard.tsx',
  'mobile/mobile-app/src/features/notification/services/pushNotificationService.ts',
  'mobile/mobile-app/src/features/profile/data/locationData.ts',
  'mobile/mobile-app/src/services/apiClient.ts',
  'mobile/mobile-app/src/utils/appBarcodeProtocol.ts',
  'mobile/mobile-app/src/utils/i18n/ar.ts',
  'mobile/mobile-app/src/utils/i18n/en.ts',
  'mobile/mobile-app/src/utils/i18n/hi.ts',
  'mobile/mobile-app/src/utils/i18n/kn.ts',
  'mobile/mobile-app/src/utils/i18n/ml.ts',
  'mobile/mobile-app/src/utils/i18n/ta.ts',
  'mobile/mobile-app/src/utils/i18n/te.ts',
  'backend/public/privacy-policy.html',
  'backend/.env.example',
  'frontend/.env.example',
  'mobile/mobile-app/.env.example'
];

for (const file of files) {
  try {
    const fullPath = path.join(__dirname, file);
    if (!fs.existsSync(fullPath)) continue;
    let content = fs.readFileSync(fullPath, 'utf8');
    console.log(`\n--- ${file} ---`);
    const lines = content.split('\n');
    lines.forEach((line, i) => {
      if (/manage[\s\-_]*my[\s\-_]*gate/i.test(line)) {
        console.log(`${i+1}: ${line.trim()}`);
      }
    });
  } catch(e) {
    console.error(e);
  }
}
