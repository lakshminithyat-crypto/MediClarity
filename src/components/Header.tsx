import { Globe } from 'lucide-react';
import { SUPPORTED_LANGUAGES, type LanguageCode } from '../types/report';

interface HeaderProps {
  language: LanguageCode;
  onLanguageChange: (language: LanguageCode) => void;
}

export function Header({ language, onLanguageChange }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200/90">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4 sm:gap-8">
        {/* Brand Logo & Wordmark */}
        <a
          href="#top"
          className="flex items-center gap-2.5 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0284C7] rounded-lg"
        >
          <span
            aria-hidden="true"
            className="w-9 h-9 rounded-lg bg-[#0284C7] text-white flex items-center justify-center shadow-xs"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M12 4.5V19.5M4.5 12H19.5"
                stroke="currentColor"
                strokeWidth="2.6"
                strokeLinecap="round"
              />
              <circle cx="12" cy="12" r="9.25" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1.5" />
            </svg>
          </span>
          <span className="font-display text-lg sm:text-xl font-bold tracking-tight text-slate-900">
            MediClarity <span className="text-[#0284C7]">AI</span>
          </span>
        </a>

        {/* Language Selector Dropdown */}
        <div className="flex items-center gap-2 shrink-0">
          <label htmlFor="language-selector" className="sr-only">
            Select explanation language
          </label>
          <div className="relative flex items-center">
            <Globe
              className="w-4 h-4 text-[#0284C7] absolute left-3 pointer-events-none"
              aria-hidden="true"
            />
            <select
              id="language-selector"
              aria-label="Language"
              value={language}
              onChange={(e) => onLanguageChange(e.target.value as LanguageCode)}
              className="appearance-none bg-white border border-slate-300 hover:border-sky-400 focus:border-[#0284C7] focus:outline-none focus:ring-2 focus:ring-sky-500/20 rounded-lg pl-9 pr-8 py-2 text-sm font-medium text-slate-800 cursor-pointer transition-colors whitespace-nowrap min-h-[40px]"
            >
              {SUPPORTED_LANGUAGES.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.code === 'English' ? item.label : `${item.label} (${item.nativeLabel})`}
                </option>
              ))}
            </select>
            <svg
              aria-hidden="true"
              className="w-4 h-4 text-slate-500 absolute right-2.5 pointer-events-none"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>
      </div>
    </header>
  );
}
