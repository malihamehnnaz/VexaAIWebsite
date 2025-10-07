
'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Card, CardContent } from '@/components/ui/card';

const aboutImage = PlaceHolderImages.find(p => p.id === 'about-us');

export default function AboutSection() {
  return (
    <motion.section
      id="about"
      className="w-full py-12 md:py-16 lg:py-20 bg-secondary"
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.5 }}
    >
      <div className="container mx-auto max-w-7xl px-4 md:px-6">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-24">
          <div className="flex flex-col justify-center space-y-6">
            <div className="space-y-4">
              <h2 className="font-headline text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-primary">
                About VexaAI
              </h2>
              <p className="max-w-[600px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                VexaAI delivers next-generation software and generative AI solutions that empower businesses across industries to automate, innovate, and scale faster. Our mission is to merge creativity with technology to build intelligent systems that adapt, learn, and evolve with your business.
              </p>
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
    </motion.section>
  );
}
