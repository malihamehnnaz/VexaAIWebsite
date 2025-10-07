
'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

const blogPosts = [
  {
    title: 'The Future of Business with Generative AI',
    description: 'Explore how generative AI is reshaping industries and what it means for your business strategy.',
    image: PlaceHolderImages.find(p => p.id === 'blog-post-1'),
    link: '/blog/future-of-gen-ai',
  },
  {
    title: 'Agentic Solutions in Business Automation',
    description: 'Discover how AI agents can automate complex workflows and drive efficiency in your business.',
    image: PlaceHolderImages.find(p => p.id === 'blog-post-4'),
    link: '/blog/agentic-solutions-in-business-automation',
  },
  {
    title: 'Is Your Business Ready for the Cloud?',
    description: 'A comprehensive guide to cloud migration, its benefits, and potential challenges.',
    image: PlaceHolderImages.find(p => p.id === 'blog-post-3'),
    link: '#',
  },
];

export default function BlogSection() {
  return (
    <motion.section 
        id="blog" 
        className="w-full py-12 md:py-16 lg:py-20 bg-secondary"
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.5 }}
    >
      <div className="container mx-auto max-w-7xl px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="space-y-2">
            <h2 className="font-headline text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-primary">
              From Our Blog
            </h2>
            <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
              Stay updated with the latest trends and insights in AI, software development, and cloud computing.
            </p>
          </div>
        </div>
        <div className="mx-auto mt-12 grid gap-8 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {blogPosts.map((post) => (
            <Card key={post.title} className="flex flex-col overflow-hidden shadow-lg hover:shadow-2xl transition-shadow duration-300">
              {post.image && (
                <Image
                  src={post.image.imageUrl}
                  alt={post.image.description}
                  width={600}
                  height={400}
                  className="w-full h-48 object-cover"
                  data-ai-hint={post.image.imageHint}
                />
              )}
              <CardHeader>
                <h3 className="font-headline text-xl font-semibold">{post.title}</h3>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-sm text-muted-foreground">{post.description}</p>
              </CardContent>
              <CardFooter>
                <Button variant="link" asChild className="p-0 h-auto">
                  <Link href={post.link}>
                    Read More <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </motion.section>
  );
}
