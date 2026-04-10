'use client';

import SectionHeading from '@/components/common/section-heading';
import { caseStudies } from '@/content/site-content';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import Reveal from '@/components/common/reveal';

const CaseStudies = () => {
  return (
    <section className="py-24 bg-background/95">
      <div className="container mx-auto px-4">
        <SectionHeading
          title="Proven Success Stories"
          description="Explore how we've helped our clients overcome their challenges and achieve their goals."
        />
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
          {caseStudies.slice(0, 2).map((study, index) => (
            <Reveal key={index} delay={index * 0.1}>
              <CaseStudyCard {...study} />
            </Reveal>
          ))}
        </div>
        <div className="mt-12 text-center">
          <Button asChild size="lg" variant="outline">
            <Link href="/case-studies">
              View All Case Studies <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

interface CaseStudyCardProps {
  slug: string;
  title: string;
  sector: string;
  overview: string;
  metrics: { label: string; value: string }[];
}

const CaseStudyCard = ({ slug, title, sector, overview, metrics }: CaseStudyCardProps) => {
  return (
    <motion.div
      className="glass-card overflow-hidden h-full flex flex-col"
      whileHover={{ y: -8, transition: { duration: 0.3 } }}
    >
      <div className="h-2 w-full bg-gradient-to-r from-primary via-primary/70 to-primary/20" />
      <div className="p-6 flex-grow flex flex-col">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary/90">{sector}</p>
        <h3 className="mt-2 text-xl font-bold text-foreground">{title}</h3>
        <p className="mt-3 text-base text-foreground/70">{overview}</p>
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {metrics.map((metric) => (
            <div key={metric.label} className="rounded-xl border border-border/50 bg-background/60 p-3">
              <p className="text-lg font-semibold text-foreground">{metric.value}</p>
              <p className="text-xs text-muted-foreground">{metric.label}</p>
            </div>
          ))}
        </div>
        <div className="mt-6">
          <Button asChild variant="link" className="p-0">
            <Link href={`/case-studies#${slug}`}>
              Read Case Study <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default CaseStudies;
