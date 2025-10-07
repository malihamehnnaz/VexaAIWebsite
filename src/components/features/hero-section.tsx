import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { ArrowRight } from 'lucide-react';
import VideoBackground from './video-background';

const heroAsset = PlaceHolderImages.find(p => p.id === 'hero-background-video');

export default function HeroSection() {
  return (
    <section className="relative h-[80vh] min-h-[500px] w-full flex items-center justify-center text-center text-white">
      {heroAsset && heroAsset.videoUrl && (
        <VideoBackground src={heroAsset.videoUrl} />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-black/20" />
      <div className="relative z-10 container px-4 md:px-6">
        <div className="flex flex-col items-center space-y-6">
          <h1 className="font-headline text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl">
            Intelligent Solutions for a Digital World
          </h1>
          <p className="max-w-[700px] text-lg md:text-xl text-gray-200">
            Vexa AI delivers cutting-edge Generative AI, custom software development, and robust cloud services to propel your business forward.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button asChild size="lg">
              <Link href="/#services">
                Explore Our Services
              </Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link href="#contact">
                Get Started <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
