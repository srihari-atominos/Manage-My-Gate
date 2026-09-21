import i18n, { LanguageCode, LANGUAGE_OPTIONS } from './i18n';

/**
 * Validates that all translation keys present in the English dictionary
 * exist with non-empty string values in all other supported language dictionaries.
 *
 * Can be invoked during dev mode or test suites to ensure 0 missing translations.
 */
export function validateTranslationDictionaries(translations: Record<LanguageCode, Record<string, string>>) {
  const enKeys = Object.keys(translations.en || {});
  const missingReport: Record<LanguageCode, string[]> = {
    en: [],
    ar: [],
    ta: [],
    hi: [],
    ml: [],
    te: [],
    kn: [],
  };

  const targetLanguages: LanguageCode[] = ['ar', 'ta', 'hi', 'ml', 'te', 'kn'];

  targetLanguages.forEach((lang) => {
    const dict = translations[lang] || {};
    enKeys.forEach((key) => {
      if (!dict[key] || dict[key].trim() === '') {
        missingReport[lang].push(key);
      }
    });
  });

  const hasMissing = Object.values(missingReport).some((arr) => arr.length > 0);

  if (hasMissing && typeof __DEV__ !== 'undefined' && __DEV__) {
    console.warn('[i18nValidator] Missing translation keys detected:', missingReport);
  }

  return {
    isValid: !hasMissing,
    totalEnglishKeys: enKeys.length,
    missingReport,
  };
}

export default validateTranslationDictionaries;
