import Image from 'next/image';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Card, CardContent } from '@/components/ui/card';
import { PlaceHolderImages } from '@/lib/placeholder-images';

const testimonials = [
  {
    client: 'Innovate Corp',
    logoId: 'client-logo-1',
    quote: 'Vexa AI transformed our data strategy. Their custom AI model has given us a significant competitive edge.',
    person: 'Jane Doe, CEO',
  },
  {
    client: 'Tech Solutions Ltd.',
    logoId: 'client-logo-2',
    quote: "The software solution they developed for us is robust, scalable, and was delivered on time and on budget. A truly professional team.",
    person: 'John Smith, CTO',
  },
  {
    client: 'CloudPioneers',
    logoId: 'client-logo-3',
    quote: 'Our migration to the cloud was seamless thanks to Vexa AI. Our infrastructure is now more efficient and cost-effective than ever.',
    person: 'Emily White, Head of IT',
  },
  {
    client: 'Future Gadgets',
    logoId: 'client-logo-4',
    quote: 'The AI consulting provided invaluable insights that are now at the core of our product development. Highly recommended.',
    person: 'Michael Brown, Founder',
  },
];

export default function PortfolioSection() {
  return (
    <section id="portfolio" className="w-full py-16 md:py-24 lg:py-32">
      <div className="container mx-auto max-w-7xl px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="space-y-2">
            <h2 className="font-headline text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-primary">
              Trusted by Industry Leaders
            </h2>
            <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
              We partner with businesses of all sizes to deliver exceptional results. Here's what our clients have to say.
            </p>
          </div>
        </div>
        <div className="mt-12">
          <Carousel
            opts={{
              align: 'start',
              loop: true,
            }}
            className="w-full"
          >
            <CarouselContent>
              {testimonials.map((testimonial, index) => {
                const logo = PlaceHolderImages.find(p => p.id === testimonial.logoId);
                return (
                  <CarouselItem key={index} className="md:basis-1/2 lg:basis-1/3">
                    <div className="p-4">
                      <Card className="h-full flex flex-col justify-between shadow-md hover:shadow-xl transition-shadow duration-300">
                        <CardContent className="flex flex-col items-center justify-center text-center p-6 space-y-6">
                           {logo && (
                            <Image
                                src={logo.imageUrl}
                                alt={`${testimonial.client} Logo`}
                                width={150}
                                height={75}
                                className="object-contain"
                                data-ai-hint={logo.imageHint}
                            />
                           )}
                           <blockquote className="text-lg italic text-foreground">
                            "{testimonial.quote}"
                           </blockquote>
                           <footer className="font-semibold text-muted-foreground">{testimonial.person}</footer>
                        </CardContent>
                      </Card>
                    </div>
                  </CarouselItem>
                );
              })}
            </CarouselContent>
            <CarouselPrevious className="hidden sm:flex" />
            <CarouselNext className="hidden sm:flex" />
          </Carousel>
        </div>
      </div>
    </section>
  );
}
