const fs = require('fs');
let content = fs.readFileSync('mobile/mobile-app/app/(auth)/accept-invite.tsx', 'utf8');

// Insert new states
const stateInsertion = `  const [submitting, setSubmitting] = useState(false);
  const [otpStep, setOtpStep] = useState<'accept' | 'otp'>('accept');
  const [otpCode, setOtpCode] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);`;

content = content.replace(/  const \[submitting, setSubmitting\] = useState\(false\);/, stateInsertion);

// Add handleInitiateOtp and handleVerifyOtp
const newMethods = `
  const handleInitiateOtp = async () => {
    setSubmitting(true);
    setApiError(null);
    try {
      const inviteToken = (resolvedToken || getTokenFromContext() || '').trim();
      await authService.initiateInvitationOtp(inviteToken);
      setOtpStep('otp');
      setResendCooldown(30);
    } catch (err: any) {
      setApiError(err?.message || err?.response?.data?.message || 'Failed to send OTP.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtp = async () => {
    setSubmitting(true);
    setApiError(null);
    try {
      const inviteToken = (resolvedToken || getTokenFromContext() || '').trim();
      const res = await authService.verifyInvitationOtp(inviteToken, otpCode);
      
      // Update store by switching to the workspace
      await switchWorkspaceContext({ targetOrgId: inviteMeta?.orgId }).unwrap().catch(() => null);
      
      router.replace('/(resident)/dashboard');
    } catch (err: any) {
      setApiError(err?.message || err?.response?.data?.message || 'Invalid verification code.');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);
`;

const insertIndex = content.indexOf('  const onSubmit = async (data: AcceptInviteFormValues) => {');
content = content.substring(0, insertIndex) + newMethods + '\n' + content.substring(insertIndex);

// UI Replacement
const passwordFormStr = `{/* Password Form (Wrapped in form on Web to satisfy browser password managers) */}`;

const ssoSepIndex = content.indexOf('{/* SSO Separator */}');
const formStart = content.indexOf(passwordFormStr);

const originalForm = content.substring(formStart, ssoSepIndex);

const updatedForm = `
                {inviteMeta?.authenticationMethod === 'OTP_LOGIN' ? (
                  <View className="mt-2">
                    {otpStep === 'accept' ? (
                      <View className="flex-col gap-3">
                        <Text className="text-sm text-muted-foreground text-center mb-2">
                          This workspace uses secure OTP login. Click below to receive a verification code.
                        </Text>
                        {apiError ? <ErrorBanner message={apiError} /> : null}
                        <View className="mt-2 flex-col gap-2 sm:flex-row">
                          <Button
                            onPress={handleInitiateOtp}
                            loading={submitting}
                            disabled={isRejecting}
                            textClassName="font-bold text-base text-white"
                            className="h-12 flex-1 items-center justify-center rounded-xl bg-emerald-600">
                            Accept Invitation
                          </Button>
                          <Button
                            onPress={handleRejectInvitation}
                            loading={isRejecting}
                            disabled={submitting}
                            variant="outline"
                            className="h-12 items-center justify-center rounded-xl border-red-500/30 px-4"
                            textClassName="font-semibold text-sm text-red-600">
                            Reject
                          </Button>
                        </View>
                      </View>
                    ) : (
                      <View className="flex-col gap-3">
                        <Text className="text-sm text-center mb-2 text-muted-foreground">
                          A verification code has been sent to <Text className="font-semibold text-foreground">{inviteMeta?.email}</Text>.
                        </Text>
                        <Input
                          label="Verification Code"
                          placeholder="123456"
                          keyboardType="number-pad"
                          maxLength={6}
                          value={otpCode}
                          onChangeText={setOtpCode}
                          autoCapitalize="none"
                        />
                        {apiError ? <ErrorBanner message={apiError} /> : null}
                        
                        <Button
                          onPress={handleVerifyOtp}
                          loading={submitting}
                          disabled={otpCode.length < 6}
                          textClassName="font-bold text-base text-white"
                          className="h-12 w-full items-center justify-center rounded-xl bg-emerald-600 mt-2">
                          Verify & Sign In
                        </Button>
                        
                        <Button
                          variant="ghost"
                          onPress={handleInitiateOtp}
                          disabled={resendCooldown > 0 || submitting}
                          className="mt-2">
                          <Text>{resendCooldown > 0 ? \`Resend Code (\${resendCooldown}s)\` : 'Resend Verification Code'}</Text>
                        </Button>
                      </View>
                    )}
                  </View>
                ) : (
                  <>
                    ` + originalForm.replace(/\$/g, '$$$$') + `
                  </>
                )}
`;

content = content.substring(0, formStart) + updatedForm + content.substring(ssoSepIndex);

fs.writeFileSync('mobile/mobile-app/app/(auth)/accept-invite.tsx', content);
