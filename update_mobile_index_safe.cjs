const fs = require('fs');
const file = 'mobile/mobile-app/app/(resident)/profile/index.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Update imports
content = content.replace('VerifyEmailOtpModal', 'ContactChangeWizardModal');

// 2. Add Wizard State
if (!content.includes('const [wizardVisible, setWizardVisible]')) {
  content = content.replace(
    'const [showEmailOtpModal, setShowEmailOtpModal] = useState(false);',
    'const [wizardVisible, setWizardVisible] = useState(false);\n  const [wizardType, setWizardType] = useState<\'email\' | \'phone\'>(\'email\');'
  );
}

// 3. Update the inputs to be read-only with a change button
const emailRegex = /<TextInput[^>]*?keyboardType="email-address"[^>]*?\/>/g;
const phoneRegex = /<TextInput[^>]*?keyboardType="phone-pad"[^>]*?\/>/g;

const newEmailInput = `<View className="flex-row items-end gap-2">
              <View className="flex-1">
                <TextInput
                  label={t('email_address', 'Email Address')}
                  labelClassName="text-sm font-bold"
                  value={email}
                  editable={false}
                  error={fieldErrors.email}
                />
              </View>
              <Button 
                variant="outline" 
                onPress={() => { setWizardType('email'); setWizardVisible(true); }}
                className="mb-1"
              >
                Change
              </Button>
            </View>`;

const newPhoneInput = `<View className="flex-row items-end gap-2">
              <View className="flex-1">
                <TextInput
                  label={t('phone_number', 'Phone Number')}
                  labelClassName="text-sm font-bold"
                  value={phone}
                  editable={false}
                  error={fieldErrors.phone}
                />
              </View>
              <Button 
                variant="outline" 
                onPress={() => { setWizardType('phone'); setWizardVisible(true); }}
                className="mb-1"
              >
                Change
              </Button>
            </View>`;

content = content.replace(/<TextInput[^>]*?keyboardType="email-address"[\s\S]*?\/>/, newEmailInput);
content = content.replace(/<TextInput[^>]*?keyboardType="phone-pad"[\s\S]*?\/>/, newPhoneInput);

// 4. Disable old handleSaveProfile logic for email change check
content = content.replace(
  'if (trimmedEmail && trimmedEmail !== currentEmail) {',
  'if (false) {'
);

// 5. Replace VerifyEmailOtpModal rendering with ContactChangeWizardModal
content = content.replace(/<VerifyEmailOtpModal[\s\S]+?devCode=\{devOtpCode\}\s+\/>/, 
  `<ContactChangeWizardModal
        visible={wizardVisible}
        type={wizardType}
        onClose={() => setWizardVisible(false)}
        onSuccess={async (payload) => {
          setWizardVisible(false);
          const formData = new FormData() as any;
          if (payload.email) {
            formData.append('email', payload.email);
            formData.append('emailOtp', payload.emailOtp);
          } else {
            formData.append('phone', payload.phone);
            formData.append('phoneOtp', payload.phoneOtp);
          }
          formData.append('updateAuthToken', payload.updateAuthToken);
          
          const res = await dispatch(updateProfileThunk(formData) as any);
          if (res.meta.requestStatus === 'fulfilled') {
            setProfileSuccess(t('profile_updated', 'Profile updated successfully!'));
            setTimeout(() => setProfileSuccess(null), 2000);
          } else {
            Alert.alert('Error', (res.payload as any)?.message || 'Failed to update profile');
          }
        }}
      />`
);

fs.writeFileSync(file, content, 'utf8');
console.log('Updated mobile index.tsx safely');
