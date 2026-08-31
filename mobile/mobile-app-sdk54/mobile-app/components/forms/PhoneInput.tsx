import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  Pressable,
  TextInput as RNTextInput,
} from 'react-native';
import { ChevronDown, Check, Phone } from 'lucide-react-native';
import { cn } from '../../lib/utils';

export interface CountryOption {
  code: string;
  name: string;
  dialCode: string;
  flag: string;
  digitsLength: number;
}

export const COUNTRIES: CountryOption[] = [
  { code: 'IN', name: 'India', dialCode: '+91', flag: '🇮🇳', digitsLength: 10 },
  { code: 'SA', name: 'Saudi Arabia', dialCode: '+966', flag: '🇸🇦', digitsLength: 9 },
  { code: 'AE', name: 'United Arab Emirates', dialCode: '+971', flag: '🇦🇪', digitsLength: 9 },
  { code: 'US', name: 'United States', dialCode: '+1', flag: '🇺🇸', digitsLength: 10 },
  { code: 'GB', name: 'United Kingdom', dialCode: '+44', flag: '🇬🇧', digitsLength: 10 },
  { code: 'QA', name: 'Qatar', dialCode: '+974', flag: '🇶🇦', digitsLength: 8 },
  { code: 'KW', name: 'Kuwait', dialCode: '+965', flag: '🇰🇼', digitsLength: 8 },
  { code: 'OM', name: 'Oman', dialCode: '+968', flag: '🇴🇲', digitsLength: 8 },
  { code: 'BH', name: 'Bahrain', dialCode: '+973', flag: '🇧🇭', digitsLength: 8 },
  { code: 'SG', name: 'Singapore', dialCode: '+65', flag: '🇸🇬', digitsLength: 8 },
  { code: 'MY', name: 'Malaysia', dialCode: '+60', flag: '🇲🇾', digitsLength: 9 },
  { code: 'AU', name: 'Australia', dialCode: '+61', flag: '🇦🇺', digitsLength: 9 },
];

export interface PhoneInputProps {
  label?: string;
  value?: string;
  onChangeText?: (fullPhoneNumber: string) => void;
  error?: string;
  placeholder?: string;
  containerClassName?: string;
}

export const PhoneInput: React.FC<PhoneInputProps> = ({
  label = 'Mobile Number',
  value = '',
  onChangeText,
  error,
  placeholder = '99887 76655',
  containerClassName,
}) => {
  const [selectedCountry, setSelectedCountry] = useState<CountryOption>(COUNTRIES[0]); // Default India +91
  const [nationalNumber, setNationalNumber] = useState('');
  const [isPickerVisible, setIsPickerVisible] = useState(false);

  // Parse initial value if passed e.g. +919988776655
  useEffect(() => {
    if (value) {
      const matched = COUNTRIES.find((c) => value.startsWith(c.dialCode));
      if (matched) {
        setSelectedCountry(matched);
        setNationalNumber(value.slice(matched.dialCode.length).trim());
      } else {
        const digits = value.replace(/[^0-9]/g, '');
        setNationalNumber(digits);
      }
    }
  }, []);

  const handleCountrySelect = (country: CountryOption) => {
    setSelectedCountry(country);
    setIsPickerVisible(false);
    const trimmedNumber = nationalNumber.slice(0, country.digitsLength);
    setNationalNumber(trimmedNumber);
    if (onChangeText) {
      onChangeText(`${country.dialCode}${trimmedNumber}`);
    }
  };

  const handleNumberChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, selectedCountry.digitsLength);
    setNationalNumber(cleaned);
    if (onChangeText) {
      onChangeText(`${selectedCountry.dialCode}${cleaned}`);
    }
  };

  return (
    <View className={cn('w-full', containerClassName)}>
      {Boolean(label) && (
        <Text className="mb-1.5 text-sm font-medium text-foreground">{label}</Text>
      )}

      <View
        className={cn(
          'flex-row items-center rounded-2xl border border-border/80 bg-card px-3.5 py-3 shadow-xs',
          Boolean(error) && 'border-destructive bg-destructive/5'
        )}
      >
        {/* Country Picker Trigger */}
        <TouchableOpacity
          onPress={() => setIsPickerVisible(true)}
          className="flex-row items-center me-2 pe-2 border-e border-border/80"
          activeOpacity={0.7}
        >
          <Text className="text-sm font-bold text-foreground me-1">
            {selectedCountry.code} {selectedCountry.dialCode}
          </Text>
          <ChevronDown size={14} className="text-muted-foreground" />
        </TouchableOpacity>

        {/* National Number Input */}
        <RNTextInput
          className="flex-1 text-[15px] font-sans text-foreground py-0 min-h-[24px]"
          style={{ outlineStyle: 'none' } as any}
          keyboardType="phone-pad"
          placeholder={placeholder}
          placeholderTextColor="#737c88"
          value={nationalNumber}
          onChangeText={handleNumberChange}
          maxLength={selectedCountry.digitsLength}
        />
      </View>

      {Boolean(error) && (
        <Text className="mt-1 text-xs text-destructive font-medium ms-1">{error}</Text>
      )}

      {/* Country Selection Modal */}
      <Modal visible={isPickerVisible} transparent animationType="fade">
        <Pressable
          className="flex-1 bg-black/50 justify-center items-center p-4"
          onPress={() => setIsPickerVisible(false)}
        >
          <Pressable
            className="w-full max-w-sm bg-card border border-border rounded-2xl p-4 shadow-xl max-h-[400px]"
            onPress={(e) => e.stopPropagation()}
          >
            <Text className="text-lg font-bold text-foreground mb-3 px-1">Select Country</Text>
            <FlatList
              data={COUNTRIES}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => handleCountrySelect(item)}
                  className={cn(
                    'flex-row items-center justify-between p-3 rounded-xl mb-1',
                    selectedCountry.code === item.code ? 'bg-primary/10' : 'active:bg-muted'
                  )}
                >
                  <View className="flex-row items-center">
                    <Text className="text-2xl me-3">{item.flag}</Text>
                    <View>
                      <Text className="text-sm font-semibold text-foreground">{item.name}</Text>
                      <Text className="text-xs text-muted-foreground">{item.dialCode}</Text>
                    </View>
                  </View>
                  {selectedCountry.code === item.code && (
                    <Check size={18} className="text-primary" />
                  )}
                </TouchableOpacity>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

export default PhoneInput;
