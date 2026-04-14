"use client";

import SolutionSection from '@/components/features/solution-section';
import { useLanguage } from '@/components/common/language-provider';
import { getLocalizedSolutions, siteCopy } from '@/lib/localization';

const solutionImages: Record<string, string | undefined> = {
  'multi-agent-operations-orchestrator': 'https://images.unsplash.com/photo-1697577418970-95d99b5a55cf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1400',
  'multi-agent-customer-service-network': 'https://images.unsplash.com/photo-1531297484001-80022131f5a1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1400',
  'internal-knowledge-assistant': 'https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1400',
  'document-intelligence-contract-review': 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1400',
  'computer-vision-quality-inspection': 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1400',
  'predictive-maintenance-intelligence': 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1400',
  'revenue-forecasting-decision-hub': 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1400',
};

export default function SolutionsPage() {
  const { language } = useLanguage();
  const copy = siteCopy[language].solutionsPage;
  const solutionsData = getLocalizedSolutions(language);

  return (
    <div className="container mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold text-center mb-12">{copy.title}</h1>
      <div className="space-y-16">
        {solutionsData.map((solution, index) => (
          <SolutionSection key={solution.slug} id={solution.slug} {...solution} image={solutionImages[solution.slug]} imagePosition={index % 2 === 0 ? 'left' : 'right'} />
        ))}
      </div>
    </div>
  );
}