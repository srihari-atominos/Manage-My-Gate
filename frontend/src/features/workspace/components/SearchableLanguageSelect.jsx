import React, { useState, useEffect, useRef } from 'react';
import { CFormInput } from '@coreui/react';

const ISO_LANGUAGES = [
  { code: 'aa', name: 'Afar' },
  { code: 'ab', name: 'Abkhazian' },
  { code: 'ae', name: 'Avestan' },
  { code: 'af', name: 'Afrikaans' },
  { code: 'ak', name: 'Akan' },
  { code: 'am', name: 'Amharic' },
  { code: 'an', name: 'Aragonese' },
  { code: 'ar', name: 'Arabic (العربية)' },
  { code: 'as', name: 'Assamese' },
  { code: 'av', name: 'Avaric' },
  { code: 'ay', name: 'Aymara' },
  { code: 'az', name: 'Azerbaijani' },
  { code: 'ba', name: 'Bashkir' },
  { code: 'be', name: 'Belarusian' },
  { code: 'bg', name: 'Bulgarian' },
  { code: 'bh', name: 'Bihari languages' },
  { code: 'bi', name: 'Bislama' },
  { code: 'bm', name: 'Bambara' },
  { code: 'bn', name: 'Bengali' },
  { code: 'bo', name: 'Tibetan' },
  { code: 'br', name: 'Breton' },
  { code: 'bs', name: 'Bosnian' },
  { code: 'ca', name: 'Catalan' },
  { code: 'ce', name: 'Chechen' },
  { code: 'ch', name: 'Chamorro' },
  { code: 'co', name: 'Corsican' },
  { code: 'cr', name: 'Cree' },
  { code: 'cs', name: 'Czech' },
  { code: 'cu', name: 'Church Slavic' },
  { code: 'cv', name: 'Chuvash' },
  { code: 'cy', name: 'Welsh' },
  { code: 'da', name: 'Danish' },
  { code: 'de', name: 'German (Deutsch)' },
  { code: 'dv', name: 'Divehi' },
  { code: 'dz', name: 'Dzongkha' },
  { code: 'ee', name: 'Ewe' },
  { code: 'el', name: 'Greek' },
  { code: 'en', name: 'English' },
  { code: 'eo', name: 'Esperanto' },
  { code: 'es', name: 'Spanish (Español)' },
  { code: 'et', name: 'Estonian' },
  { code: 'eu', name: 'Basque' },
  { code: 'fa', name: 'Persian' },
  { code: 'ff', name: 'Fulah' },
  { code: 'fi', name: 'Finnish' },
  { code: 'fj', name: 'Fijian' },
  { code: 'fo', name: 'Faroese' },
  { code: 'fr', name: 'French (Français)' },
  { code: 'fy', name: 'Western Frisian' },
  { code: 'ga', name: 'Irish' },
  { code: 'gd', name: 'Gaelic' },
  { code: 'gl', name: 'Galician' },
  { code: 'gn', name: 'Guarani' },
  { code: 'gu', name: 'Gujarati' },
  { code: 'gv', name: 'Manx' },
  { code: 'ha', name: 'Hausa' },
  { code: 'he', name: 'Hebrew' },
  { code: 'hi', name: 'Hindi (हिन्दी)' },
  { code: 'ho', name: 'Hiri Motu' },
  { code: 'hr', name: 'Croatian' },
  { code: 'ht', name: 'Haitian' },
  { code: 'hu', name: 'Hungarian' },
  { code: 'hy', name: 'Armenian' },
  { code: 'hz', name: 'Herero' },
  { code: 'ia', name: 'Interlingua' },
  { code: 'id', name: 'Indonesian' },
  { code: 'ie', name: 'Interlingue' },
  { code: 'ig', name: 'Igbo' },
  { code: 'ii', name: 'Sichuan Yi' },
  { code: 'ik', name: 'Inupiaq' },
  { code: 'io', name: 'Ido' },
  { code: 'is', name: 'Icelandic' },
  { code: 'it', name: 'Italian (Italiano)' },
  { code: 'iu', name: 'Inuktitut' },
  { code: 'ja', name: 'Japanese (日本語)' },
  { code: 'jv', name: 'Javanese' },
  { code: 'ka', name: 'Georgian' },
  { code: 'kg', name: 'Kongo' },
  { code: 'ki', name: 'Kikuyu' },
  { code: 'kj', name: 'Kuanyama' },
  { code: 'kk', name: 'Kazakh' },
  { code: 'kl', name: 'Kalaallisut' },
  { code: 'km', name: 'Khmer' },
  { code: 'kn', name: 'Kannada' },
  { code: 'ko', name: 'Korean (한국어)' },
  { code: 'kr', name: 'Kanuri' },
  { code: 'ks', name: 'Kashmiri' },
  { code: 'ku', name: 'Kurdish' },
  { code: 'kv', name: 'Komi' },
  { code: 'kw', name: 'Cornish' },
  { code: 'ky', name: 'Kirghiz' },
  { code: 'la', name: 'Latin' },
  { code: 'lb', name: 'Luxembourgish' },
  { code: 'lg', name: 'Ganda' },
  { code: 'li', name: 'Limburgish' },
  { code: 'ln', name: 'Lingala' },
  { code: 'lo', name: 'Lao' },
  { code: 'lt', name: 'Lithuanian' },
  { code: 'lu', name: 'Luba-Katanga' },
  { code: 'lv', name: 'Latvian' },
  { code: 'mg', name: 'Malagasy' },
  { code: 'mh', name: 'Marshallese' },
  { code: 'mi', name: 'Maori' },
  { code: 'mk', name: 'Macedonian' },
  { code: 'ml', name: 'Malayalam' },
  { code: 'mn', name: 'Mongolian' },
  { code: 'mr', name: 'Marathi' },
  { code: 'ms', name: 'Malay' },
  { code: 'mt', name: 'Maltese' },
  { code: 'my', name: 'Burmese' },
  { code: 'na', name: 'Nauru' },
  { code: 'nb', name: 'Norwegian Bokmål' },
  { code: 'nd', name: 'North Ndebele' },
  { code: 'ne', name: 'Nepali' },
  { code: 'ng', name: 'Ndonga' },
  { code: 'nl', name: 'Dutch' },
  { code: 'nn', name: 'Norwegian Nynorsk' },
  { code: 'no', name: 'Norwegian' },
  { code: 'nr', name: 'South Ndebele' },
  { code: 'nv', name: 'Navajo' },
  { code: 'ny', name: 'Chichewa' },
  { code: 'oc', name: 'Occitan' },
  { code: 'oj', name: 'Ojibwa' },
  { code: 'om', name: 'Oromo' },
  { code: 'or', name: 'Oriya' },
  { code: 'os', name: 'Ossetian' },
  { code: 'pa', name: 'Panjabi' },
  { code: 'pi', name: 'Pali' },
  { code: 'pl', name: 'Polish' },
  { code: 'ps', name: 'Pashto' },
  { code: 'pt', name: 'Portuguese (Português)' },
  { code: 'qu', name: 'Quechua' },
  { code: 'rm', name: 'Romansh' },
  { code: 'rn', name: 'Rundi' },
  { code: 'ro', name: 'Romanian' },
  { code: 'ru', name: 'Russian (Русский)' },
  { code: 'rw', name: 'Kinyarwanda' },
  { code: 'sa', name: 'Sanskrit' },
  { code: 'sc', name: 'Sardinian' },
  { code: 'sd', name: 'Sindhi' },
  { code: 'se', name: 'Northern Sami' },
  { code: 'sg', name: 'Sango' },
  { code: 'si', name: 'Sinhala' },
  { code: 'sk', name: 'Slovak' },
  { code: 'sl', name: 'Slovenian' },
  { code: 'sm', name: 'Samoan' },
  { code: 'sn', name: 'Shona' },
  { code: 'so', name: 'Somali' },
  { code: 'sq', name: 'Albanian' },
  { code: 'sr', name: 'Serbian' },
  { code: 'ss', name: 'Swati' },
  { code: 'st', name: 'Sotho, Southern' },
  { code: 'su', name: 'Sundanese' },
  { code: 'sv', name: 'Swedish' },
  { code: 'sw', name: 'Swahili' },
  { code: 'ta', name: 'Tamil' },
  { code: 'te', name: 'Telugu' },
  { code: 'tg', name: 'Tajik' },
  { code: 'th', name: 'Thai' },
  { code: 'ti', name: 'Tigrinya' },
  { code: 'tk', name: 'Turkmen' },
  { code: 'tl', name: 'Tagalog' },
  { code: 'tn', name: 'Tswana' },
  { code: 'to', name: 'Tonga' },
  { code: 'tr', name: 'Turkish (Türkçe)' },
  { code: 'ts', name: 'Tsonga' },
  { code: 'tt', name: 'Tatar' },
  { code: 'tw', name: 'Twi' },
  { code: 'ty', name: 'Tahitian' },
  { code: 'ug', name: 'Uighur' },
  { code: 'uk', name: 'Ukrainian' },
  { code: 'ur', name: 'Urdu (اردو)' },
  { code: 'uz', name: 'Uzbek' },
  { code: 've', name: 'Venda' },
  { code: 'vi', name: 'Vietnamese' },
  { code: 'vo', name: 'Volapük' },
  { code: 'wa', name: 'Walloon' },
  { code: 'wo', name: 'Wolof' },
  { code: 'xh', name: 'Xhosa' },
  { code: 'yi', name: 'Yiddish' },
  { code: 'yo', name: 'Yoruba' },
  { code: 'za', name: 'Zhuang' },
  { code: 'zh', name: 'Chinese (中文)' },
  { code: 'zu', name: 'Zulu' }
];

export const SearchableLanguageSelect = ({ label, value, onChange, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef(null);

  const selectedLanguage = ISO_LANGUAGES.find(l => l.code === value);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync display value when value prop changes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery(selectedLanguage ? selectedLanguage.name : '');
    }
  }, [value, isOpen, selectedLanguage]);

  const filteredLanguages = ISO_LANGUAGES.filter(lang =>
    lang.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lang.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleInputFocus = () => {
    if (!disabled) {
      setIsOpen(true);
      setSearchQuery('');
    }
  };

  const handleSelectLanguage = (code) => {
    onChange(code);
    setIsOpen(false);
  };

  return (
    <div className="position-relative" ref={dropdownRef}>
      <CFormInput
        label={label}
        disabled={disabled}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onFocus={handleInputFocus}
        placeholder="Search language..."
        className="pe-5"
        style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
      />
      
      {/* Down arrow icon */}
      <span 
        className="position-absolute end-0 top-50 translate-middle-y me-3 text-muted pointer-events-none"
        style={{ marginTop: label ? '12px' : '0px' }}
      >
        ▼
      </span>

      {isOpen && !disabled && (
        <div 
          className="position-absolute w-100 bg-white border rounded-3 mt-1 shadow-lg overflow-y-auto"
          style={{ zIndex: 1050, maxHeight: '200px' }}
        >
          {filteredLanguages.length > 0 ? (
            filteredLanguages.map(lang => (
              <div
                key={lang.code}
                className="p-2 cursor-pointer hover-bg-light text-dark"
                style={{ cursor: 'pointer', transition: 'background-color 0.2s' }}
                onClick={() => handleSelectLanguage(lang.code)}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#f1f5f9'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
              >
                {lang.name} <span className="text-muted small">({lang.code})</span>
              </div>
            ))
          ) : (
            <div className="p-2 text-muted text-center small">No languages found</div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchableLanguageSelect;
