import re

file_path = r'd:\atominos\GatedCommunity\mobile\mobile-app\src\features\userManagement\components\InviteUserModal.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add phone state
content = re.sub(
    r'const \[email, setEmail\] = useState\(\'\'\);',
    "const [email, setEmail] = useState('');\n  const [phone, setPhone] = useState('');",
    content
)

# 2. Reset form
content = re.sub(
    r'setEmail\(\'\'\);\n\s*setSelectedRoleName\(\'\'\);\n\s*setSelectedVillaId\(\'\'\);',
    "setEmail('');\n    setPhone('');\n    setSelectedRoleName('');",
    content
)

# 3. Handle submit validation
content = re.sub(
    r'// Validate villa if tenant role\s*if \(isTenantRole && !selectedVillaId\) \{[^}]+\}',
    "if (!phone.trim()) {\n      setSubmitError('Phone number is required.');\n      return;\n    }",
    content
)

# 4. Handle submit payload
content = re.sub(
    r'email: email\.trim\(\),\n\s*villaId: isTenantRole \? selectedVillaId \|\| null : null,\n\s*residentType,\n\s*roleName: selectedRoleName \|\| null,',
    "email: email.trim(),\n        phone: phone.trim(),\n        roleName: selectedRoleName || null,",
    content
)

# 5. Add phone input to UI
phone_input = """</View>

                  <View>
                    <TextInput
                      label={t('phone_number', 'Phone Number')}
                      required
                      placeholder="+1234567890"
                      value={phone}
                      onChangeText={setPhone}
                      keyboardType="phone-pad"
                    />
                  </View>"""
content = re.sub(r'</View>\n\n\s*\{\/\* Role Select \*\/\}', phone_input + '\n\n                  {/* Role Select */}', content)

# 6. Remove Villa Select UI
content = re.sub(
    r'\{\/\* Villa Select for Unit Roles \*\/\}[\s\S]*?\{\/\* Modal Footer \*\/\}',
    '{/* Modal Footer */}',
    content
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
