import re

file_path = r'd:\atominos\GatedCommunity\mobile\mobile-app\app\(auth)\login.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update basic auth schema to email auth schema
content = re.sub(
    r'const basicAuthSchema = yup\.object\(\)\.shape\(\{\n\s*login: yup\n\s*\.string\(\)\n\s*\.required\(\'Email or Username is required\'\)\n\s*\.min\(3, \'Must be at least 3 characters\'\),\n\s*password: yup\n\s*\.string\(\)\n\s*\.required\(\'Password is required\'\)\n\s*\.min\(4, \'Password must be at least 4 characters\'\),\n\}\);',
    "const emailAuthSchema = yup.object().shape({\n  login: yup.string().required('Email is required').email('Must be a valid email'),\n});",
    content
)

# 2. Update Form values
content = re.sub(
    r'interface BasicAuthFormValues \{\n\s*login: string;\n\s*password: string;\n\}',
    'interface EmailFormValues {\n  login: string;\n}',
    content
)

# 3. Update basicForm hook
content = re.sub(
    r'const basicForm = useForm<BasicAuthFormValues>\(\{[\s\S]*?\}\);',
    "const basicForm = useForm<EmailFormValues>({\n    resolver: yupResolver(emailAuthSchema),\n    mode: 'onTouched',\n    defaultValues: {\n      login: params.email ? decodeURIComponent(params.email) : '',\n    },\n  });",
    content
)

# 4. Remove keep signed in
content = re.sub(r'const \[keepSignedIn, setKeepSignedIn\] = React\.useState\(true\);\n', '', content)
content = re.sub(r'const handleKeepSignedInChange = [\s\S]*?\}\n  \};\n', '', content)
content = re.sub(r'const savePreferences = async \(\) => \{[\s\S]*?\}\n  \};\n', 'const savePreferences = async () => {};\n', content)

# 5. Update onBasicSubmit
on_basic_submit = """const onBasicSubmit = async (data: EmailFormValues) => {
    setIsSubmittingBasic(true);
    try {
      await requestOtp(data.login.trim(), true);
    } finally {
      setIsSubmittingBasic(false);
    }
  };"""
content = re.sub(r'const onBasicSubmit = async \(data: BasicAuthFormValues\) => \{[\s\S]*?\}\n  \};\n', on_basic_submit + '\n', content)

# 6. Remove Password field UI
content = re.sub(r'\{\/\* Step 6: Password Input \*\/\}[\s\S]*?<\/View>\n\n\s*\{\/\* Step 7: Options Row \*\/\}[\s\S]*?<\/View>', '', content)
content = re.sub(r'onSubmitEditing=\{\(\) => passwordInputRef\.current\?\.focus\(\)\}', '', content)

# 7. Use OTP reactively for Email
content = re.sub(
    r'if \(otpSent && submittedPhone\) \{',
    'if (otpSent) {',
    content
)
content = re.sub(
    r'params: \{ phone: submittedPhone \},',
    'params: { phone: submittedPhone, email: basicForm.getValues("login") },',
    content
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
