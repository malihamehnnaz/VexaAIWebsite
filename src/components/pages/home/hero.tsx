'use client';

import { Button } from '@/components/ui/button';
import { ArrowRight, Bot, Cpu, Sparkles } from 'lucide-react';
import Link from 'next/link';
import Reveal from '@/components/common/reveal';
import Image from 'next/image';
import { motion } from 'framer-motion';

const heroImages = {
  primary: 'https://images.unsplash.com/photo-1697577418970-95d99b5a55cf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1400',
  secondary: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1200',
  tertiary: 'https://images.unsplash.com/photo-1531297484001-80022131f5a1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1200',
};

const Hero = () => {
  return (
    <section className="relative overflow-hidden pt-24 pb-12 md:pt-28 md:pb-14">
      <div className="absolute inset-0 -z-20 bg-hero-gradient" />
      <motion.div
        aria-hidden="true"
        className="absolute -top-28 left-1/2 -z-10 h-72 w-72 -translate-x-1/2 rounded-full bg-cyan-500/15 blur-3xl"
        animate={{ scale: [1, 1.18, 1], opacity: [0.4, 0.75, 0.4] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        aria-hidden="true"
        className="absolute right-0 top-20 -z-10 h-80 w-80 rounded-full bg-rose-500/15 blur-3xl"
        animate={{ y: [0, -20, 0], opacity: [0.25, 0.45, 0.25] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="container relative z-10 mx-auto grid max-w-7xl gap-10 px-4 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div className="text-center lg:text-left">
          <Reveal>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-background/60 px-4 py-2 text-sm text-foreground/80 shadow-lg shadow-primary/5 backdrop-blur-md">
              <Sparkles className="h-4 w-4 text-primary" />
              AI systems, product engineering, and cloud delivery
            </div>
          </Reveal>
          <Reveal>
            <h1 className="mt-5 text-5xl font-bold leading-[1.02] tracking-tighter text-foreground md:text-7xl">
              Build AI products that feel
              <span className="block bg-gradient-to-r from-cyan-400 via-primary to-rose-400 bg-clip-text text-transparent">
                fast, elegant, and alive.
              </span>
            </h1>
          </Reveal>
          <Reveal>
            <p className="mt-5 max-w-2xl text-lg text-foreground/70 lg:mx-0 mx-auto">
              Vexa AI designs intelligent customer experiences, enterprise copilots, and production-grade software that turn complex operations into clear momentum.
            </p>
          </Reveal>
          <Reveal>
            <div className="mt-6 flex flex-col items-center gap-4 sm:flex-row lg:justify-start">
              <Button asChild size="lg" className="group min-w-44">
                <Link href="/contact">
                  Start Your Project <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="min-w-44 border-primary/20 bg-background/50 backdrop-blur-sm">
                <Link href="/solutions">
                  See Solutions
                </Link>
              </Button>
            </div>
          </Reveal>

          <Reveal>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-background/55 p-4 text-left shadow-xl backdrop-blur-md">
                <Cpu className="h-5 w-5 text-cyan-400" />
                <p className="mt-3 text-sm font-semibold">AI-native delivery</p>
                <p className="mt-1 text-sm text-muted-foreground">From model orchestration to polished UX.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-background/55 p-4 text-left shadow-xl backdrop-blur-md">
                <Bot className="h-5 w-5 text-primary" />
                <p className="mt-3 text-sm font-semibold">Assistants that work</p>
                <p className="mt-1 text-sm text-muted-foreground">Grounded, branded, and production ready.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-background/55 p-4 text-left shadow-xl backdrop-blur-md">
                <Sparkles className="h-5 w-5 text-rose-400" />
                <p className="mt-3 text-sm font-semibold">Premium interfaces</p>
                <p className="mt-1 text-sm text-muted-foreground">Motion, clarity, and conversion-focused design.</p>
              </div>
            </div>
          </Reveal>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
          className="relative mx-auto w-full max-w-[640px]"
        >
          <motion.div
            aria-hidden="true"
            className="absolute inset-6 rounded-[2rem] bg-gradient-to-br from-cyan-400/20 via-primary/10 to-rose-400/20 blur-2xl"
            animate={{ opacity: [0.35, 0.7, 0.35], scale: [1, 1.04, 1] }}
            transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          />

          <div className="relative rounded-[2rem] border border-white/10 bg-background/40 p-3 shadow-2xl backdrop-blur-xl">
            <motion.div
              className="relative overflow-hidden rounded-[1.6rem] border border-white/10"
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Image
                src={heroImages.primary}
                alt="AI interface visualization"
                width={1200}
                height={800}
                className="h-auto w-full object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-background/45 via-transparent to-cyan-300/10" />
            </motion.div>

            <motion.div
              className="absolute -left-8 top-10 hidden w-48 rounded-2xl border border-cyan-300/20 bg-slate-950/70 p-3 shadow-xl backdrop-blur-lg md:block"
              animate={{ y: [0, -12, 0], rotate: [-3, 0, -3] }}
              transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Image
                src={heroImages.secondary}
                alt="Cloud systems visualization"
                width={320}
                height={220}
                className="h-28 w-full rounded-xl object-cover"
              />
              <p className="mt-3 text-sm font-medium text-white">Cloud + data foundations</p>
            </motion.div>

            <motion.div
              className="absolute -bottom-8 -right-6 hidden w-52 rounded-2xl border border-rose-300/20 bg-slate-950/70 p-3 shadow-xl backdrop-blur-lg md:block"
              animate={{ y: [0, 12, 0], rotate: [3, 0, 3] }}
              transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Image
                src={heroImages.tertiary}
                alt="Retrieval augmented chatbot visualization"
                width={320}
                height={220}
                className="h-28 w-full rounded-xl object-cover"
              />
              <p className="mt-3 text-sm font-medium text-white">Live copilots and RAG chatbots</p>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
