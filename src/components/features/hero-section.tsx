import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { ChevronRight } from 'lucide-react';

const heroImage = PlaceHolderImages.find(p => p.id === 'hero-background');

export default function HeroSection() {
  return (
    <section className="relative h-screen min-h-[600px] w-full flex items-center justify-center text-center text-white overflow-hidden">
      {heroImage && heroImage.imageUrl && (
        <Image
          src={heroImage.imageUrl}
          alt={heroImage.description}
          fill
          className="object-cover -z-10"
          priority
          data-ai-hint={heroImage.imageHint}
        />
      )}
      <div className="absolute inset-0 bg-black/60 z-0" />
      <div className="relative z-10 container px-4 md:px-6">
        <div className="flex flex-col items-center space-y-6">
          <h1 className="font-headline text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            Intelligent Solutions for a Dynamic World
          </h1>
          <p className="max-w-[700px] text-lg md:text-xl text-gray-200">
            We specialize in crafting cutting-edge solutions in Generative AI, custom software, and cloud infrastructure.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button asChild size="lg">
              <Link href="#contact">
                Get Started
                <ChevronRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="bg-transparent hover:bg-white/10 hover:text-white border-white text-white">
              <Link href="#services">
                Explore Services
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
