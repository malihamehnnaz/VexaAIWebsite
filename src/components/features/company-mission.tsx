
'use client';

import { siteCopy } from '@/lib/localization';
import { useLanguage } from '@/components/common/language-provider';

export default function CompanyMission() {
  const { language } = useLanguage();
  const copy = siteCopy[language].about;

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4 text-center">
        <h1 className="text-4xl font-bold mb-4">{copy.missionTitle}</h1>
        <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
          {copy.missionDescription}
        </p>
      </div>
    </section>
  );
}