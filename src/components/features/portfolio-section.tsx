
'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { PlaceHolderImages } from '@/lib/placeholder-images';

const projects = [
  {
    title: 'Mobile App for Grocery Delivery',
    description: 'A user-friendly mobile application that simplifies grocery shopping with real-time tracking and seamless payment integration.',
    imageId: 'project-grocery-app',
  },
  {
    title: 'HRM Website with Chat Engine',
    description: 'A comprehensive Human Resource Management website featuring a company-specific, AI-powered chat engine for instant employee support.',
    imageId: 'project-hrm-website',
  },
  {
    title: 'Automation Testing Framework',
    description: 'A robust automation testing framework for QA teams, designed to accelerate release cycles and improve software quality.',
    imageId: 'project-automation-testing',
  },
];

export default function PortfolioSection() {
  return (
    <motion.section 
        id="portfolio" 
        className="w-full py-8 md:py-12 lg:py-16"
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.5 }}
    >
      <div className="container mx-auto max-w-7xl px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="space-y-2">
            <h2 className="font-headline text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-primary">
              Trusted by Industry Leaders
            </h2>
            <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
              We have successfully delivered 23 projects for clients all over the world. Here are a few examples of our work.
            </p>
          </div>
        </div>
        <div className="mt-12">
          <Carousel
            opts={{
              align: 'start',
            }}
            className="w-full"
          >
            <CarouselContent>
              {projects.map((project, index) => {
                const image = PlaceHolderImages.find(p => p.id === project.imageId);
                return (
                  <CarouselItem key={index} className="md:basis-1/2 lg:basis-1/3">
                    <div className="p-4 h-full">
                      <Card className="h-full flex flex-col overflow-hidden shadow-md hover:shadow-xl transition-shadow duration-300">
                        {image && (
                           <Image
                               src={image.imageUrl!}
                               alt={project.title}
                               width={600}
                               height={400}
                               className="w-full h-48 object-cover"
                               data-ai-hint={image.imageHint}
                           />
                        )}
                        <CardHeader>
                          <CardTitle className="font-headline text-xl">{project.title}</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-grow">
                          <CardDescription>{project.description}</CardDescription>
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
    </motion.section>
  );
}
