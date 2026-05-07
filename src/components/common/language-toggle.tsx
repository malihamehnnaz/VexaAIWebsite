'use client';

import { Button } from '@/components/ui/button';
import { languageOptions } from '@/lib/localization';
import { useLanguage } from '@/components/common/language-provider';
import { cn } from '@/lib/utils';

function SwedenFlag() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 rounded-full" aria-hidden="true">
      <defs>
        <clipPath id="sweden-flag-circle">
          <circle cx="12" cy="12" r="12" />
        </clipPath>
      </defs>
      <g clipPath="url(#sweden-flag-circle)">
        <rect width="24" height="24" fill="#005293" />
        <rect x="7" width="4" height="24" fill="#FECB00" />
        <rect y="10" width="24" height="4" fill="#FECB00" />
      </g>
    </svg>
  );
}

function AustraliaFlag() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 rounded-full" aria-hidden="true">
      <defs>
        <clipPath id="australia-flag-circle">
          <circle cx="12" cy="12" r="12" />
        </clipPath>
      </defs>
      <g clipPath="url(#australia-flag-circle)">
        <rect width="24" height="24" fill="#012169" />
        <rect width="12" height="12" fill="#012169" />
        <path d="M0 0L12 12M12 0L0 12" stroke="#FFFFFF" strokeWidth="2.4" />
        <path d="M0 0L12 12M12 0L0 12" stroke="#C8102E" strokeWidth="1.2" />
        <rect x="5" width="2" height="12" fill="#FFFFFF" />
        <rect y="5" width="12" height="2" fill="#FFFFFF" />
        <rect x="5.4" width="1.2" height="12" fill="#C8102E" />
        <rect y="5.4" width="12" height="1.2" fill="#C8102E" />
        <circle cx="16.5" cy="8" r="1.2" fill="#FFFFFF" />
        <circle cx="19.2" cy="11" r="1" fill="#FFFFFF" />
        <circle cx="17.2" cy="14.5" r="1.1" fill="#FFFFFF" />
        <circle cx="20" cy="16.8" r="1.3" fill="#FFFFFF" />
        <circle cx="14.3" cy="18.2" r="1.5" fill="#FFFFFF" />
      </g>
    </svg>
  );
}

function FlagIcon({ value }: { value: 'en' | 'sv' }) {
  if (value === 'sv') {
    return <SwedenFlag />;
  }

  return <AustraliaFlag />;
}

export default function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/80 p-1 shadow-sm backdrop-blur-sm">
      {languageOptions.map((option) => (
        <Button
          key={option.value}
          type="button"
          variant="ghost"
          size="icon"
          aria-pressed={language === option.value}
          aria-label={option.nativeLabel}
          title={option.label}
          className={cn(
            'h-9 w-9 rounded-full border border-transparent p-0 text-xl leading-none transition-all',
            language === option.value
              ? 'border-primary/30 bg-primary/12 ring-2 ring-primary/25 hover:bg-primary/12'
              : 'hover:border-border hover:bg-muted/80'
          )}
          onClick={() => setLanguage(option.value)}
        >
          <FlagIcon value={option.value} />
        </Button>
      ))}
    </div>
  );
}
