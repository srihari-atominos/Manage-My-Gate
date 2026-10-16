const fs = require('fs');
let c = fs.readFileSync('backend/src/features/user/user.listeners.js', 'utf8');
c = c.replace(/<!-- CTA Buttons -->[\s\S]*?<!-- App Download Section -->/, \<!-- Login Instructions -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 28px 0 12px 0;">
                <tr>
                  <td align="left" style="padding-bottom: 16px; color: #334155; font-size: 15px;">
                    <strong>To access your account:</strong><br/><br/>
                    1. Download the app or visit our portal.<br/>
                    2. Choose to log in via <strong>Email OTP</strong> or <strong>Mobile Number OTP</strong>.<br/>
                    3. Enter your registered email/phone and verify the OTP.<br/>
                  </td>
                </tr>
              </table>

              <!-- App Download Section -->\);
fs.writeFileSync('backend/src/features/user/user.listeners.js', c);
