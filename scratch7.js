const fs = require('fs');
let content = fs.readFileSync('frontend/src/views/pages/invite/InviteHandler.jsx', 'utf8');

// 1. Add import
content = content.replace("import { InviteMobileHandoffCard } from '../../../features/auth/components/InviteMobileHandoffCard.jsx'", "import { InviteMobileHandoffCard } from '../../../features/auth/components/InviteMobileHandoffCard.jsx'\nimport { OtpInviteFlow } from '../../../features/auth/components/OtpInviteFlow.jsx'");

// 2. Replace tabs and forms rendering with a conditional block
const findString = `{/* Segmented Tab Controls: New User vs Existing User */}`;
const replaceString = `{inviteData?.authenticationMethod === 'OTP_LOGIN' && flowState !== 'ALREADY_ACCEPTED' ? (
                  <OtpInviteFlow 
                    token={token} 
                    email={inviteData?.email}
                    onSuccess={() => {
                      // On success, we reload or re-validate so the invite logic redirects to dashboard
                      window.location.reload();
                    }}
                  />
                ) : (
                  <React.Fragment>
                    {/* Segmented Tab Controls: New User vs Existing User */}`;

content = content.replace(findString, replaceString);

// Find the end of Tab 2 and close the React.Fragment
const findTab2End = `                    </div>
                  )}

                  {/* Option to decline/reject workspace invitation */}`;

const replaceTab2End = `                    </div>
                  )}
                  </React.Fragment>
                )}

                  {/* Option to decline/reject workspace invitation */}`;

content = content.replace(findTab2End, replaceTab2End);
fs.writeFileSync('frontend/src/views/pages/invite/InviteHandler.jsx', content);
