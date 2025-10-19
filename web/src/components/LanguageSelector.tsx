import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

const languages = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'nb-NO', name: 'Norwegian Bokmål', nativeName: 'Norsk bokmål' },
  { code: 'nn-NO', name: 'Norwegian Nynorsk', nativeName: 'Norsk nynorsk' },
  { code: 'lt', name: 'Lithuanian', nativeName: 'Lietuvių' },
];

export default function LanguageSelector() {
  const { i18n } = useTranslation();

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    i18n.changeLanguage(e.target.value);
  };

  return (
    <div className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 shadow-sm">
      <Globe className="h-4 w-4 text-gray-500" />
      <select
        value={i18n.language}
        onChange={handleLanguageChange}
        className="cursor-pointer border-none bg-transparent text-sm text-gray-700 focus:outline-none focus:ring-0"
      >
        {languages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.nativeName}
          </option>
        ))}
      </select>
    </div>
  );
}
