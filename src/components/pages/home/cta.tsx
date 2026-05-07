'use client';

import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import Reveal from '@/components/common/reveal';
import { siteCopy } from '@/lib/localization';
import { useLanguage } from '@/components/common/language-provider';

const Cta = () => {
  const { language } = useLanguage();
  const copy = siteCopy[language].home;

  return (
    <section className="py-14 md:py-16 bg-background/95">
      <div className="container mx-auto px-4 text-center">
        <Reveal>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tighter">
            {copy.ctaTitle}
          </h2>
        </Reveal>
        <Reveal>
          <p className="mt-3 max-w-2xl mx-auto text-lg text-foreground/70">
            {copy.ctaDescription}
          </p>
        </Reveal>
        <Reveal>
          <div className="mt-5">
            <Button asChild size="lg" className="group">
              <Link href="/contact">
                {copy.getInTouch} <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
};

export default Cta;
