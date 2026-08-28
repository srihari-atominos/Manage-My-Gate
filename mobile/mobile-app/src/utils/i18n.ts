import storage from './storage';

export type LanguageCode = 'en' | 'ta' | 'hi';

export interface LanguageOption {
  code: LanguageCode;
  label: string;
  nativeName: string;
}

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: 'en', label: 'English (US)', nativeName: 'English (US)' },
  { code: 'ta', label: 'தமிழ் (Tamil)', nativeName: 'தமிழ்' },
  { code: 'hi', label: 'हिन्दी (Hindi)', nativeName: 'हिन्दी' },
];

const TRANSLATIONS: Record<LanguageCode, Record<string, string>> = {
  en: {
    app_settings: 'App Settings',
    settings_subtitle: 'Manage appearance, notifications & account preferences',
    appearance_language: 'Appearance & Language',
    theme_mode: 'Theme Mode',
    system_default: 'Phone Default',
    light_mode: 'Light Mode',
    dark_mode: 'Dark Mode',
    language: 'Language',
    select_language: 'Select Language',
    notifications: 'Notifications',
    push_notifications: 'Push Notifications',
    push_desc: 'Receive instant gate arrival and security alerts',
    account_actions: 'Account Actions',
    clear_cache: 'Clear Application Cache',
    sign_out: 'Sign Out',
    confirm_sign_out: 'Are you sure you want to sign out of your account?',
    cancel: 'Cancel',
    success: 'Success',
    cache_cleared: 'Application cache cleared successfully.',
    logged_in_as: 'Logged In Resident',
    edit_profile: 'Edit Profile',
    change_photo: 'Change Photo',
    full_name: 'Full Name',
    email_address: 'Email Address',
    phone_number: 'Phone Number',
    save_changes: 'Save Changes',
    profile_updated: 'Profile updated successfully!',
  },
  ta: {
    app_settings: 'பயன்பாட்டு அமைப்புகள்',
    settings_subtitle: 'தோற்றம், அறிவிப்புகள் மற்றும் கணக்கு விருப்பங்களை நிர்வகிக்கவும்',
    appearance_language: 'தோற்றம் & மொழி',
    theme_mode: 'தீம் முறை',
    system_default: 'போன் இயல்புநிலை',
    light_mode: 'லைட் மோட்',
    dark_mode: 'டார்க் மோட்',
    language: 'மொழி',
    select_language: 'மொழியைத் தேர்ந்தெடுக்கவும்',
    notifications: 'அறிவிப்புகள்',
    push_notifications: 'புஷ் அறிவிப்புகள்',
    push_desc: 'கேட் வருகை மற்றும் பாதுகாப்பு விழிப்பூட்டல்களை உடனடியாகப் பெறுங்கள்',
    account_actions: 'கணக்கு நடவடிக்கைகள்',
    clear_cache: 'பயன்பாட்டு தற்காலிக சேமிப்பை அழிக்கவும்',
    sign_out: 'வெளியேறு',
    confirm_sign_out: 'கணக்கிலிருந்து நிச்சயமாக வெளியேற விரும்புகிறீர்களா?',
    cancel: 'ரத்து செய்',
    success: 'வெற்றி',
    cache_cleared: 'பயன்பாட்டு தற்காலிக சேமிப்பு வெற்றிகரமாக அழிக்கப்பட்டது.',
    logged_in_as: 'உள்நுழைந்த குடியிருப்பாளர்',
    edit_profile: 'சுயவிவரத்தைத் திருத்து',
    change_photo: 'புகைப்படத்தை மாற்றவும்',
    full_name: 'முழு பெயர்',
    email_address: 'மின்னஞ்சல் முகவரி',
    phone_number: 'தொலைபேசி எண்',
    save_changes: 'மாற்றங்களைச் சேமிக்கவும்',
    profile_updated: 'சுயவிவரம் வெற்றிகரமாக புதுப்பிக்கப்பட்டது!',
  },
  hi: {
    app_settings: 'ऐप सेटिंग्स',
    settings_subtitle: 'रुप, सूचनाएं और खाता प्राथमिकताओं को प्रबंधित करें',
    appearance_language: 'रुप और भाषा',
    theme_mode: 'थीम मोड',
    system_default: 'फ़ोन डिफ़ॉल्ट',
    light_mode: 'लाइट मोड',
    dark_mode: 'डार्क मोड',
    language: 'भाषा',
    select_language: 'भाषा चुनें',
    notifications: 'सूचनाएं',
    push_notifications: 'पुश सूचनाएं',
    push_desc: 'गेट आगमन और सुरक्षा अलर्ट तुरंत प्राप्त करें',
    account_actions: 'खाता कार्रवाइयां',
    clear_cache: 'एप्लिकेशन कैशे साफ करें',
    sign_out: 'साइन आउट करें',
    confirm_sign_out: 'क्या आप निश्चित रूप से अपने खाते से साइन आउट करना चाहते हैं?',
    cancel: 'रद्द करें',
    success: 'सफलता',
    cache_cleared: 'एप्लिकेशन कैशे सफलतापूर्वक साफ किया गया।',
    logged_in_as: 'लॉग इन निवासी',
    edit_profile: 'प्रोफ़ाइल संपादित करें',
    change_photo: 'फ़ोटो बदलें',
    full_name: 'पूरा नाम',
    email_address: 'ईमेल पता',
    phone_number: 'फ़ोन नंबर',
    save_changes: 'बदलाव सहेजें',
    profile_updated: 'प्रोफ़ाइल सफलतापूर्वक अपडेट की गई!',
  },
};

let currentLanguageCode: LanguageCode = 'en';

export const i18n = {
  getCurrentLanguage: (): LanguageCode => currentLanguageCode,
  
  setLanguage: async (code: LanguageCode): Promise<void> => {
    currentLanguageCode = code;
    try {
      await storage.setItem('language_preference', code);
    } catch (e) {
      console.warn('Failed to save language preference:', e);
    }
  },

  initLanguage: async (): Promise<LanguageCode> => {
    try {
      const saved = await storage.getItem('language_preference');
      if (saved && (saved === 'en' || saved === 'ta' || saved === 'hi')) {
        currentLanguageCode = saved as LanguageCode;
      }
    } catch (e) {
      console.warn('Failed to init language preference:', e);
    }
    return currentLanguageCode;
  },

  t: (key: string, fallback?: string): string => {
    const dict = TRANSLATIONS[currentLanguageCode] || TRANSLATIONS.en;
    return dict[key] || fallback || TRANSLATIONS.en[key] || key;
  },
};

export default i18n;
