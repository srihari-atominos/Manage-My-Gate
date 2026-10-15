const fs = require('fs');
const file = 'mobile/mobile-app/app/(resident)/profile/index.tsx';
let content = fs.readFileSync(file, 'utf8');

// The error was that setShowEmailOtpModal was called inside executeProfileUpdate and handleSaveProfile.
// I disabled handleSaveProfile's "if (email changed)" block, so I can just remove the interior or replace it.
content = content.replace('setShowEmailOtpModal(false);', '');
content = content.replace('setShowEmailOtpModal(true);', '');

// Also let's fix the missing `</View>`. The issue is likely in `newEmailInput` or `newPhoneInput` where I used `<TextInput>` without `</View>` closing properly because I replaced the `<TextInput ... />`.
// Wait, my replacement string was:
/*
<View className="flex-row items-end gap-2">
  <View className="flex-1">
    <TextInput ... />
  </View>
  <Button ...>Change</Button>
</View>
*/
// It's perfectly balanced. Why is there a missing tag?
// Let's count tags in index.tsx
const viewCount = content.split('<View').length - 1;
const closeViewCount = content.split('</View>').length - 1;

if (viewCount > closeViewCount) {
  // Let's find where. It's likely I replaced `<TextInput.../>` but the original had `</TextInput>`? No, it was self-closing.
  // Did I accidentally delete a `</View>` during replacement?
  // Let's look at the regex: content.replace(/<TextInput[^>]*?keyboardType="email-address"[\s\S]*?\/>/, newEmailInput)
  // `[\s\S]*?` is dangerous. It might have matched across multiple lines and swallowed `</View>`.
}

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed setShowEmailOtpModal calls');
