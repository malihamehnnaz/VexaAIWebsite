'use client';

import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import Reveal from '@/components/common/reveal';

const Hero = () => {
  return (
    <section className="relative pt-32 pb-24 text-center">
      <div className="container mx-auto px-4">
        <Reveal>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-foreground/90 to-foreground/60 leading-tight">
            Engineering the Future with Intelligent Solutions
          </h1>
        </Reveal>
        <Reveal>
          <p className="mt-6 max-w-2xl mx-auto text-lg text-foreground/70">
            Vexa AI is your strategic partner in navigating the complexities of the digital age. We specialize in delivering transformative Generative AI, bespoke software, and robust cloud infrastructure to propel your business forward.
          </p>
        </Reveal>
        <Reveal>
          <div className="mt-8 flex justify-center items-center gap-4">
            <Button asChild size="lg" className="group">
              <Link href="/contact">
                Start Your Project <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/services">
                Explore Services
              </Link>
            </Button>
          </div>
        </Reveal>
      </div>
      <div className="absolute inset-0 -z-10 bg-hero-gradient" />
    </section>
  );
};

export default Hero;
