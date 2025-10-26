import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { PlayCircle } from 'lucide-react';

const heroAsset = PlaceHolderImages.find(p => p.id === 'hero-background-video');

export default function HeroSection() {
  return (
    <section className="relative h-screen min-h-[600px] w-full flex items-center justify-center text-center text-white overflow-hidden">
      {heroAsset && heroAsset.videoUrl && (
        <video
            src={heroAsset.videoUrl}
            autoPlay
            loop
            muted
            playsInline
            className="absolute top-0 left-0 w-full h-full object-cover -z-10"
            data-ai-hint={heroAsset.imageHint}
        />
      )}
      <div className="absolute inset-0 bg-black/60 z-0" />
      <div className="relative z-10 container px-4 md:px-6">
        <div className="flex flex-col items-center space-y-6">
          <h1 className="font-headline text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            We are a global team of strategists, designers and engineers.
          </h1>
          <p className="max-w-[700px] text-lg md:text-xl text-gray-200">
            We help businesses grow and transform through technology and design.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button asChild variant="outline" size="lg" className="bg-transparent hover:bg-primary/10 hover:text-primary-foreground border-primary text-primary-foreground">
              <Link href="#">
                <PlayCircle className="mr-2 h-5 w-5" />
                Play Reel
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
