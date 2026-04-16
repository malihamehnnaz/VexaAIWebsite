"use client";

import CaseStudyCard from '@/components/features/case-study-card';
import { useLanguage } from '@/components/common/language-provider';
import { getLocalizedCaseStudies, siteCopy } from '@/lib/localization';

const caseStudyImages: Record<string, string> = {
  'finops-ai-assistant': 'https://images.unsplash.com/photo-1605379399642-870262d3d051?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1400',
  'cloud-platform-modernization': 'https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1400',
  'executive-analytics-hub': 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1400',
};

export default function CaseStudiesPage() {
  const { language } = useLanguage();
  const copy = siteCopy[language].caseStudiesPage;
  const caseStudiesData = getLocalizedCaseStudies(language);

  return (
    <div className="container mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold text-center mb-12">{copy.title}</h1>
      <div className="space-y-16">
        {caseStudiesData.map((study) => (
          <CaseStudyCard key={study.slug} id={study.slug} {...study} image={caseStudyImages[study.slug]} />
        ))}
      </div>
    </div>
  );
}