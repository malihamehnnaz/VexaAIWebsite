import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Card, CardContent } from '@/components/ui/card';

const aboutImage = PlaceHolderImages.find(p => p.id === 'about-us');

export default function AboutSection() {
  return (
    <section id="about" className="w-full py-16 md:py-24 lg:py-32 bg-secondary">
      <div className="container mx-auto max-w-7xl px-4 md:px-6">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-24">
          <div className="flex flex-col justify-center space-y-6">
            <div className="space-y-4">
              <h2 className="font-headline text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-primary">
                Our Mission & Vision
              </h2>
              <p className="max-w-[600px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                At Vexa AI, our mission is to empower businesses with transformative technology. We believe in building intelligent solutions that drive growth, efficiency, and innovation.
              </p>
            </div>
            <div className="space-y-4">
                <h3 className="font-headline text-2xl font-bold tracking-tighter">Our Values</h3>
                <ul className="grid gap-4">
                  <li>
                    <p>
                      <span className="font-semibold text-foreground">Innovation:</span> We are committed to pushing the boundaries of what's possible with AI and software.
                    </p>
                  </li>
                  <li>
                    <p>
                      <span className="font-semibold text-foreground">Partnership:</span> We work closely with our clients, building strong relationships to achieve shared success.
                    </p>
                  </li>
                  <li>
                    <p>
                      <span className="font-semibold text-foreground">Excellence:</span> We strive for the highest quality in everything we do, from code to customer service.
                    </p>
                  </li>
                </ul>
            </div>
          </div>
          <div className="flex items-center justify-center">
            {aboutImage && (
                <Card className="overflow-hidden shadow-2xl">
                    <CardContent className="p-0">
                        <Image
                            src={aboutImage.imageUrl}
                            alt={aboutImage.description}
                            width={800}
                            height={600}
                            className="aspect-[4/3] object-cover"
                            data-ai-hint={aboutImage.imageHint}
                        />
                    </CardContent>
                </Card>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
