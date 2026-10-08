const fs = require('fs');
let content = fs.readFileSync('frontend/src/views/pages/invite/InviteHandler.jsx', 'utf8');

const replaceStr1 = `<OtpInviteFlow 
                    token={token} 
                    email={inviteData?.email}
                    onSuccess={() => {
                      // On success, we reload or re-validate so the invite logic redirects to dashboard
                      window.location.reload();
                    }}
                  />`;
                  
const withProps = `<OtpInviteFlow 
                    token={token} 
                    email={inviteData?.email}
                    isMobileDevice={isMobileDevice()}
                    onAcceptDeviceRouting={() => {
                      if (isMobileDevice()) {
                        processSuccessfulAcceptance();
                      }
                    }}
                    onSuccess={() => {
                      // On success, we reload or re-validate so the invite logic redirects to dashboard
                      window.location.reload();
                    }}
                  />`;
                  
content = content.replace(replaceStr1, withProps);
fs.writeFileSync('frontend/src/views/pages/invite/InviteHandler.jsx', content);
