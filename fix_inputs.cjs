const fs = require('fs');
let file = 'mobile/mobile-app/app/(resident)/profile/index.tsx';
let content = fs.readFileSync(file, 'utf8');

const oldEmailBlock = `<View className="flex-row items-end gap-2">
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

const newEmailBlock = `<TextInput
              label={t('email_address', 'Email Address')}
              labelClassName="text-sm font-bold"
              value={email}
              editable={false}
              error={fieldErrors.email}
              rightIcon={<Text className="text-[#F45A0A] font-bold text-sm me-2">{t('change', 'Change')}</Text>}
              onRightIconPress={() => { setWizardType('email'); setWizardVisible(true); }}
            />`;

const oldPhoneBlock = `<View className="flex-row items-end gap-2">
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

const newPhoneBlock = `<TextInput
              label={t('phone_number', 'Phone Number')}
              labelClassName="text-sm font-bold"
              value={phone}
              editable={false}
              error={fieldErrors.phone}
              rightIcon={<Text className="text-[#F45A0A] font-bold text-sm me-2">{t('change', 'Change')}</Text>}
              onRightIconPress={() => { setWizardType('phone'); setWizardVisible(true); }}
            />`;

content = content.replace(oldEmailBlock, newEmailBlock);
content = content.replace(oldPhoneBlock, newPhoneBlock);

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed email and phone inputs');
