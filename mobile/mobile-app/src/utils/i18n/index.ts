import React, { useState, useEffect } from 'react';
import { I18nManager } from 'react-native';
import storage from '../storage';

import en from './en';
import ar from './ar';
import ta from './ta';
import hi from './hi';
import ml from './ml';
import te from './te';
import kn from './kn';

// Strictly lock LTR layout across all languages
try {
  I18nManager.allowRTL(false);
  I18nManager.forceRTL(false);
} catch (e) {}

export type LanguageCode = 'en' | 'ta' | 'hi' | 'ml' | 'te' | 'kn' | 'ar';

export interface LanguageOption {
  code: LanguageCode;
  label: string;
  nativeName: string;
}

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: 'en', label: 'English (US)', nativeName: 'English (US)' },
  { code: 'ar', label: 'العربية (Arabic)', nativeName: 'العربية' },
  { code: 'ta', label: 'தமிழ் (Tamil)', nativeName: 'தமிழ்' },
  { code: 'hi', label: 'हिन्दी (Hindi)', nativeName: 'हिन्दी' },
  { code: 'ml', label: 'മലയാളം (Malayalam)', nativeName: 'മലയാളം' },
  { code: 'te', label: 'తెలుగు (Telugu)', nativeName: 'తెలుగు' },
  { code: 'kn', label: 'ಕನ್ನಡ (Kannada)', nativeName: 'ಕನ್ನಡ' },
];

export const TRANSLATIONS: Record<LanguageCode, Record<string, string>> = {
  en,
  ar,
  ta,
  hi,
  ml,
  te,
  kn,
};

let currentLanguageCode: LanguageCode = 'en';
const listeners = new Set<(lang: LanguageCode) => void>();
const warnedKeys = new Set<string>();

export const i18n = {
  getCurrentLanguage: (): LanguageCode => currentLanguageCode,

  hasKey: (key?: string): boolean => {
    if (!key) return false;
    const dict = TRANSLATIONS[currentLanguageCode] || TRANSLATIONS.en;
    return Boolean(dict && dict[key]);
  },

  subscribe: (listener: (lang: LanguageCode) => void): (() => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  setLanguage: async (code: LanguageCode): Promise<void> => {
    currentLanguageCode = code;
    try {
      I18nManager.allowRTL(false);
      I18nManager.forceRTL(false);
    } catch (e) {}

    if (typeof document !== 'undefined') {
      try {
        document.documentElement.setAttribute('dir', 'ltr');
        document.documentElement.setAttribute('lang', code);
        document.documentElement.setAttribute('data-lang', code);
        document.documentElement.style.direction = 'ltr';
        if (document.body) {
          document.body.setAttribute('dir', 'ltr');
          document.body.setAttribute('lang', code);
          document.body.setAttribute('data-lang', code);
          document.body.style.direction = 'ltr';
        }
      } catch (e) {}
    }

    try {
      await storage.setItem('language_preference', code);
    } catch (e) {
      console.warn('Failed to save language preference:', e);
    }
    listeners.forEach((fn) => fn(code));
  },

  initLanguage: async (): Promise<LanguageCode> => {
    try {
      I18nManager.allowRTL(false);
      I18nManager.forceRTL(false);
    } catch (e) {}
    try {
      const saved = await storage.getItem('language_preference');
      if (
        saved &&
        (saved === 'en' ||
          saved === 'ar' ||
          saved === 'ta' ||
          saved === 'hi' ||
          saved === 'ml' ||
          saved === 'te' ||
          saved === 'kn')
      ) {
        currentLanguageCode = saved as LanguageCode;
      }
    } catch (e) {
      console.warn('Failed to init language preference:', e);
    }
    if (typeof document !== 'undefined') {
      try {
        document.documentElement.setAttribute('dir', 'ltr');
        document.documentElement.setAttribute('lang', currentLanguageCode);
        document.documentElement.setAttribute('data-lang', currentLanguageCode);
        document.documentElement.style.direction = 'ltr';
        if (document.body) {
          document.body.setAttribute('dir', 'ltr');
          document.body.setAttribute('lang', currentLanguageCode);
          document.body.setAttribute('data-lang', currentLanguageCode);
          document.body.style.direction = 'ltr';
        }
      } catch (e) {}
    }
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      const enKeys = Object.keys(en);
      const targetLanguages: LanguageCode[] = ['ar', 'ta', 'hi', 'ml', 'te', 'kn'];
      targetLanguages.forEach((l) => {
        const missing = enKeys.filter((k) => !TRANSLATIONS[l][k]);
        if (missing.length > 0) {
          console.warn(`[i18n Parity Warning] Language "${l}" missing ${missing.length} keys:`, missing.slice(0, 5));
        }
      });
    }
    return currentLanguageCode;
  },

  t: (
    key: string,
    fallbackOrParams?: string | Record<string, any>,
    params?: Record<string, any>
  ): string => {
    let fallback: string | undefined;
    let interpolationParams: Record<string, any> | undefined;

    if (typeof fallbackOrParams === 'object' && fallbackOrParams !== null) {
      interpolationParams = fallbackOrParams;
      fallback = undefined;
    } else {
      fallback = fallbackOrParams;
      interpolationParams = params;
    }

    const dict = TRANSLATIONS[currentLanguageCode] || TRANSLATIONS.en;
    let text = dict[key];

    if (!text) {
      // 1. Direct normalization fallback (e.g., dot notation "common.status.available" -> "status_available" or "available")
      const dotToUnderscore = key.toLowerCase().replace(/\./g, '_');
      const cleanNormalized = key.toLowerCase().replace(/[^a-z0-9]+/g, '_');
      const suffixOnly = key.includes('.') ? key.split('.').pop()!.toLowerCase().replace(/[^a-z0-9]+/g, '_') : '';
      const statusKey = `status_${cleanNormalized.replace(/^status_|^common_status_/, '')}`;

      if (dict[dotToUnderscore]) {
        text = dict[dotToUnderscore];
      } else if (dict[cleanNormalized]) {
        text = dict[cleanNormalized];
      } else if (dict[statusKey]) {
        text = dict[statusKey];
      } else if (suffixOnly && dict[suffixOnly]) {
        text = dict[suffixOnly];
      } else if (fallback) {
        text = i18n.translateText(fallback);
      } else {
        text = TRANSLATIONS.en[key] || TRANSLATIONS.en[cleanNormalized] || key;
      }

      if (
        !dict[key] &&
        !dict[dotToUnderscore] &&
        !dict[cleanNormalized] &&
        !dict[statusKey] &&
        /^[a-zA-Z0-9_.-]+$/.test(key) &&
        typeof __DEV__ !== 'undefined' &&
        __DEV__ &&
        currentLanguageCode !== 'en'
      ) {
        const warnTag = `${currentLanguageCode}:${key}`;
        if (!warnedKeys.has(warnTag)) {
          warnedKeys.add(warnTag);
          console.warn(`[i18n Dev Warning] Missing translation key "${key}" in "${currentLanguageCode}"`);
        }
      }
    }

    if (interpolationParams && text) {
      Object.keys(interpolationParams).forEach((pKey) => {
        const val = interpolationParams[pKey];
        text = text.replace(new RegExp(`\\{${pKey}\\}|\\{\\{${pKey}\\}\\}`, 'g'), String(val));
      });
    }

    return text;
  },

  tRole: (role?: string, fallback?: string): string => {
    if (!role) return fallback || 'Resident';
    const roleKey = `role_${String(role).toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
    const direct = i18n.t(roleKey);
    if (direct !== roleKey) return direct;
    return i18n.translateText(fallback || String(role));
  },

  /**
   * Translates text dynamically to active language using clean phrase and exact dictionary matches.
   */
  translateText: (rawText?: string): string => {
    if (!rawText || typeof rawText !== 'string') {
      return rawText || '';
    }
    if (currentLanguageCode === 'en') {
      return rawText;
    }

    const trimmed = rawText.trim();
    if (!trimmed) return rawText;

    const dict = TRANSLATIONS[currentLanguageCode];
    if (!dict) return rawText;

    // 1. Exact direct key or normalized key match
    const normalizedKey = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    if (dict[normalizedKey]) {
      return dict[normalizedKey];
    }

    // 2. Direct match against English values in dictionary
    for (const [k, enVal] of Object.entries(TRANSLATIONS.en)) {
      if (enVal.toLowerCase() === trimmed.toLowerCase() && dict[k]) {
        return dict[k];
      }
    }

    // 3. Known compound phrases (e.g. "Villa A-104" -> "الفيلا A-104" or "Flat 404-B")
    const villaPrefixMatch = trimmed.match(/^(Villa|Unit|Flat|Building)\s+(.+)$/i);
    if (villaPrefixMatch) {
      const prefix = villaPrefixMatch[1].toLowerCase();
      const unitCode = villaPrefixMatch[2];
      const translatedPrefix = dict[prefix] || dict.villa || dict.unit || villaPrefixMatch[1];
      return `${translatedPrefix} ${unitCode}`;
    }

    return rawText;
  },
};

export const useTranslation = () => {
  const [lang, setLang] = useState<LanguageCode>(i18n.getCurrentLanguage());

  useEffect(() => {
    return i18n.subscribe((newLang) => {
      setLang(newLang);
    });
  }, []);

  const t = (
    key: string,
    fallbackOrParams?: string | Record<string, any>,
    params?: Record<string, any>
  ): string => i18n.t(key, fallbackOrParams, params);

  const tRole = (role?: string, fallback?: string): string => i18n.tRole(role, fallback);
  const tFeatureName = (id?: string, fallback?: string): string => {
    if (id) {
      const directKey = `feature_${id}_name`;
      const direct = i18n.t(directKey);
      if (direct !== directKey) return direct;
      if (i18n.t(id) !== id) return i18n.t(id);
    }
    return i18n.translateText(fallback || id || '');
  };

  const tFeatureSubtitle = (id?: string, fallback?: string): string => {
    if (id) {
      const directKey = `feature_${id}_sub`;
      const direct = i18n.t(directKey);
      if (direct !== directKey) return direct;
    }
    return i18n.translateText(fallback || '');
  };

  const tCategoryName = (key?: string, fallback?: string): string => {
    if (key) {
      const direct = i18n.t(key);
      if (direct !== key) return direct;
    }
    return i18n.translateText(fallback || key || '');
  };

  return {
    t,
    tRole,
    tFeatureName,
    tFeatureSubtitle,
    tCategoryName,
    hasKey: i18n.hasKey,
    language: lang,
    languageCode: lang,
    setLanguage: i18n.setLanguage,
    translateText: i18n.translateText,
  };
};

export const STATUS_KEY_MAP: Record<string, string> = {
  active: 'status_active',
  available: 'status_available',
  unavailable: 'status_unavailable',
  pending: 'status_pending',
  approved: 'status_approved',
  rejected: 'status_rejected',
  revoked: 'status_revoked',
  expired: 'status_expired',
  open: 'status_open',
  in_progress: 'status_in_progress',
  'in progress': 'status_in_progress',
  assigned: 'status_assigned',
  resolved: 'status_resolved',
  closed: 'status_closed',
  paid: 'status_paid',
  unpaid: 'status_unpaid',
  overdue: 'status_overdue',
  partial: 'status_partial',
  cancelled: 'status_cancelled',
  general: 'cat_all',
  maintenance: 'cat_maintenance',
  management: 'cat_management',
  security: 'cat_security',
  staff: 'cat_staff',
  resident: 'cat_resident',
};

export const getStatusTranslationKey = (status?: string): string => {
  if (!status) return 'status';
  const clean = String(status).toLowerCase().trim().replace(/[\s\/-]+/g, '_');
  return STATUS_KEY_MAP[clean] || `status_${clean}`;
};

export const translateText = i18n.translateText;
export const t = i18n.t;
export const tRole = i18n.tRole;

export default i18n;
