const fs = require('fs');
let content = fs.readFileSync('frontend/src/features/auth/components/OtpInviteFlow.jsx', 'utf8');

content = content.replace(
  'export const OtpInviteFlow = ({ token, email, onSuccess }) => {',
  'export const OtpInviteFlow = ({ token, email, onSuccess, onAcceptDeviceRouting, isMobileDevice }) => {'
);

const oldHandleAccept = `  const handleAccept = async () => {
    setLoading(true)
    setError('')
    try {
      await initiateInvitationOtp(token)
      setStep('otp')
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to initiate OTP')
    } finally {
      setLoading(false)
    }
  }`;

const newHandleAccept = `  const handleAccept = async () => {
    if (isMobileDevice) {
      // Defer to parent for handoff
      onAcceptDeviceRouting();
      return;
    }

    setLoading(true)
    setError('')
    try {
      await initiateInvitationOtp(token)
      setStep('otp')
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to initiate OTP')
    } finally {
      setLoading(false)
    }
  }`;

content = content.replace(oldHandleAccept, newHandleAccept);
fs.writeFileSync('frontend/src/features/auth/components/OtpInviteFlow.jsx', content);
