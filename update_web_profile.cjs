const fs = require('fs');
const file = 'frontend/src/features/auth/views/ProfileView.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add Import
if (!content.includes('ContactChangeWizard')) {
  content = content.replace(
    "import useWorkspace from '../../workspace/hooks/useWorkspace'",
    "import useWorkspace from '../../workspace/hooks/useWorkspace'\nimport ContactChangeWizard from '../components/ContactChangeWizard'"
  );
}

// 2. Add state
if (!content.includes('wizardVisible')) {
  content = content.replace(
    "const [contextError, setContextError] = useState(null)",
    "const [contextError, setContextError] = useState(null)\n  const [wizardVisible, setWizardVisible] = useState(false)\n  const [wizardType, setWizardType] = useState('email')"
  );
}

// 3. Update onSubmit to just handle normal profile changes (minus phone/email since they use wizard)
if (content.includes('formData.append(\'phone\', data.phone)')) {
  content = content.replace(
    /if \(data\.phone !== undefined\) \{\s*formData\.append\('phone', data\.phone\)\s*\}/,
    "// Phone is handled via wizard"
  );
}

// 4. Update the Email Field UI
const oldEmailHtml = `{/* Email Address */}
                  <div className="mb-3">
                    <CFormLabel htmlFor="page-profile-email-input" className="fw-semibold small">
                      Email Address
                    </CFormLabel>
                    <CFormInput
                      id="page-profile-email-input"
                      type="email"
                      disabled
                      {...register('email')}
                    />
                    <div className="text-muted small mt-1">
                      Email address is managed by administrator and cannot be changed.
                    </div>
                  </div>`;

const newEmailHtml = `{/* Email Address */}
                  <div className="mb-3">
                    <CFormLabel htmlFor="page-profile-email-input" className="fw-semibold small">
                      Email Address
                    </CFormLabel>
                    <div className="d-flex gap-2">
                      <CFormInput
                        id="page-profile-email-input"
                        type="email"
                        disabled
                        {...register('email')}
                      />
                      <CButton 
                        color="secondary" 
                        variant="outline" 
                        onClick={() => { setWizardType('email'); setWizardVisible(true); }}
                      >
                        Change
                      </CButton>
                    </div>
                  </div>`;

if (content.includes('Email address is managed by administrator and cannot be changed.')) {
  content = content.replace(oldEmailHtml, newEmailHtml);
}

// 5. Update the Phone Field UI
// The phone field currently allows typing, but it crashes on save. I will make it disabled and add a Change button.
const oldPhoneHtml = `                    <Controller
                      name="phone"
                      control={control}
                      rules={{
                        validate: (value) => {
                          if (!value) return true
                          if (value.length < expectedPhoneLength) {
                            return 'Invalid phone number length for this country.'
                          }
                          return true
                        },
                      }}
                      render={({ field: { onChange, value } }) => (
                        <PhoneInput
                          country={'in'}
                          value={value}
                          onChange={(phone, country) => {
                            if (country && country.format) {
                              setExpectedPhoneLength(country.format.replace(/[^.]/g, '').length)
                            }
                            onChange(phone)
                          }}
                          containerStyle={{ width: '100%' }}
                          inputStyle={{
                            width: '100%',
                            height: '38px',
                            border: '1px solid #d1d5db',
                            borderRadius: '0.375rem',
                            fontSize: '14px',
                          }}
                          buttonStyle={{
                            border: '1px solid #d1d5db',
                            borderRadius: '0.375rem 0 0 0.375rem',
                            backgroundColor: '#f3f4f6',
                          }}
                          disabled={loading}
                        />
                      )}
                    />
                    {errors.phone && (
                      <div className="text-danger small mt-1">{errors.phone.message}</div>
                    )}`;

const newPhoneHtml = `                    <div className="d-flex gap-2 align-items-start">
                      <div style={{ flex: 1 }}>
                        <Controller
                          name="phone"
                          control={control}
                          render={({ field: { value } }) => (
                            <PhoneInput
                              country={'in'}
                              value={value}
                              containerStyle={{ width: '100%' }}
                              inputStyle={{
                                width: '100%',
                                height: '38px',
                                border: '1px solid #d1d5db',
                                borderRadius: '0.375rem',
                                fontSize: '14px',
                                backgroundColor: '#e9ecef',
                              }}
                              buttonStyle={{
                                border: '1px solid #d1d5db',
                                borderRadius: '0.375rem 0 0 0.375rem',
                                backgroundColor: '#e9ecef',
                              }}
                              disabled={true}
                            />
                          )}
                        />
                      </div>
                      <CButton 
                        color="secondary" 
                        variant="outline" 
                        style={{ height: '38px' }}
                        onClick={() => { setWizardType('phone'); setWizardVisible(true); }}
                      >
                        Change
                      </CButton>
                    </div>`;

if (content.includes('name="phone"')) {
  // It's a large block, string replacement might fail. Let's use regex or just simpler replacement.
  content = content.replace(oldPhoneHtml, newPhoneHtml);
}

// 6. Append the ContactChangeWizard at the end of the return statement before last closing tags
if (!content.includes('<ContactChangeWizard')) {
  const wizardHtml = `
      <ContactChangeWizard 
        visible={wizardVisible}
        onClose={() => setWizardVisible(false)}
        type={wizardType}
        onSuccess={async (payload) => {
          const formData = new FormData()
          if (payload.email) {
            formData.append('email', payload.email)
            formData.append('emailOtp', payload.emailOtp)
          } else {
            formData.append('phone', payload.phone)
            formData.append('phoneOtp', payload.phoneOtp)
          }
          formData.append('updateAuthToken', payload.updateAuthToken)
          await updateProfile(formData)
        }}
      />
    </CCard>`;
  
  content = content.replace('</CCard>', wizardHtml);
}

fs.writeFileSync(file, content, 'utf8');
console.log('Updated ProfileView.jsx');
