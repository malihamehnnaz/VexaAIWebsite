'use client';

import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import Reveal from '@/components/common/reveal';

const Cta = () => {
  return (
    <section className="py-24 bg-background/95">
      <div className="container mx-auto px-4 text-center">
        <Reveal>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tighter">
            Ready to Start Your Next Project?
          </h2>
        </Reveal>
        <Reveal>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-foreground/70">
            Let's build something amazing together. Contact us to discuss your ideas and how we can help you achieve your goals.
          </p>
        </Reveal>
        <Reveal>
          <div className="mt-8">
            <Button asChild size="lg" className="group">
              <Link href="/contact">
                Get in Touch <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
};

export default Cta;
