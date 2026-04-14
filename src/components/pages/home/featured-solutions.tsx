'use client';

import SectionHeading from '@/components/common/section-heading';
import { getLocalizedSolutions, siteCopy } from '@/lib/localization';
import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import Reveal from '@/components/common/reveal';
import { useLanguage } from '@/components/common/language-provider';

const FeaturedSolutions = () => {
  const { language } = useLanguage();
  const copy = siteCopy[language].home;
  const solutions = getLocalizedSolutions(language);

  return (
    <section className="py-14 md:py-16 bg-background/95">
      <div className="container mx-auto px-4">
        <SectionHeading
          title={copy.solutionsTitle}
          description={copy.solutionsDescription}
          className="space-y-3"
        />
        <div className="mt-7 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {solutions.slice(0, 2).map((solution, index) => (
            <Reveal key={index} delay={index * 0.1}>
              <SolutionCard {...solution} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};

interface SolutionCardProps {
  slug: string;
  title: string;
  summary: string;
  highlights: string[];
}

const SolutionCard = ({ slug, title, summary, highlights }: SolutionCardProps) => {
  const { language } = useLanguage();
  const copy = siteCopy[language].home;

  return (
    <motion.div
      className="glass-card p-8 h-full flex flex-col"
      whileHover={{ y: -8, transition: { duration: 0.3 } }}
    >
      <div className="flex-grow">
        <h3 className="text-2xl font-bold text-foreground">{title}</h3>
        <p className="mt-4 text-base text-foreground/70">{summary}</p>
        <ul className="mt-6 space-y-3">
          {highlights.map((feature, index) => (
            <li key={index} className="flex items-start">
              <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
              <span className="ml-3 text-foreground/80">{feature}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-8">
        <Button asChild variant="outline" className="w-full">
          <Link href={`/solutions#${slug}`}>
            {copy.learnMore}
          </Link>
        </Button>
      </div>
    </motion.div>
  );
};

export default FeaturedSolutions;
