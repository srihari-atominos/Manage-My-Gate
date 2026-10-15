const fs = require('fs');
const file = 'frontend/src/features/auth/views/ProfileView.jsx';
let content = fs.readFileSync(file, 'utf8');

const regex = /<CFormLabel htmlFor="page-profile-phone-input"[\s\S]+?\{errors\.phone && \([\s\S]+?<\/div>\s+\}\s+<\/div>/;

const replacement = `<CFormLabel htmlFor="page-profile-phone-input" className="fw-semibold small">
                    Phone Number
                  </CFormLabel>
                  <div className="d-flex gap-2 align-items-start">
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
                  </div>
                </div>`;

if (content.match(regex)) {
  content = content.replace(regex, replacement);
  fs.writeFileSync(file, content, 'utf8');
  console.log('Fixed phone replacement completely');
} else {
  console.log('Regex did not match');
}
