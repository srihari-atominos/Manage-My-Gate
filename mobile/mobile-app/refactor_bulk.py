import re

file_path = r'd:\atominos\GatedCommunity\mobile\mobile-app\src\features\userManagement\components\BulkInviteModal.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update InviteRowItem interface
content = re.sub(
    r'email: string;\n\s*roleName: string;\n\s*villaId: string;\n\s*residentType: string;',
    'email: string;\n  phone: string;\n  roleName: string;',
    content
)

# 2. Update default row creation
content = re.sub(
    r'email: \'\',\n\s*roleName: defaultRole,\n\s*villaId: \'\',\n\s*residentType: \'None\',',
    "email: '',\n              phone: '',\n              roleName: defaultRole,",
    content, count=1
)
content = re.sub(
    r'email: \'\',\n\s*roleName: defaultRole,\n\s*villaId: \'\',\n\s*residentType: \'None\',',
    "email: '',\n      phone: '',\n      roleName: defaultRole,",
    content
)

# 3. CSV Parsing
content = re.sub(
    r'const roleName = parts\[1\] \|\| \(roles\[0\]\?\.name \|\| \'\'\);\n\s*const villaName = parts\[2\] \|\| \'\';\n\s*const residentType = parts\[3\] \|\| \'None\';',
    "const phone = parts[1] || '';\n      const roleName = parts[2] || (roles[0]?.name || '');",
    content
)
content = re.sub(
    r'const matchingVilla = [\s\S]*?;\n\n\s*const row: InviteRowItem = \{\n\s*id: String\(Date\.now\(\) \+ index\),\n\s*email,\n\s*roleName,\n\s*villaId: matchingVilla\?._id \|\| matchingVilla\?.id \|\| \'\',\n\s*residentType,',
    "const row: InviteRowItem = {\n        id: String(Date.now() + index),\n        email,\n        phone,\n        roleName,",
    content
)

# 4. Handle Submit Mapping
content = re.sub(
    r'email: r\.email\.trim\(\),\n\s*roleName: r\.roleName \|\| null,\n\s*villaId: r\.villaId \|\| null,\n\s*residentType: r\.residentType \|\| \'None\',',
    "email: r.email.trim(),\n        phone: r.phone.trim(),\n        roleName: r.roleName || null,",
    content
)

# 5. UI Updates
phone_ui = """</View>

                          {/* Phone Field */}
                          <View className="mb-2.5">
                            <Text className="text-[11px] font-semibold text-muted-foreground mb-1 text-start">Phone Number *</Text>
                            <TextInput
                              placeholder="+1234567890"
                              value={row.phone}
                              onChangeText={(val) => handleRowChange(row.id, 'phone', val)}
                              keyboardType="phone-pad"
                            />
                          </View>"""
content = re.sub(r'<\/View>\n\n\s*\{\/\* Role Selection \*\/\}', phone_ui + '\n\n                          {/* Role Selection */}', content)

content = re.sub(
    r'\{\/\* Unit Selection if Tenant\/Unit role \*\/\}[\s\S]*?<\/View>\n\s*\);\n\s*\}\)',
    '</View>\n                      );\n                    })',
    content
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
