'use client';

import SectionHeading from '@/components/common/section-heading';
import { testimonials } from '@/content/site-content';
import { motion } from 'framer-motion';
import Reveal from '@/components/common/reveal';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const Testimonials = () => {
  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <SectionHeading
          title="What Our Clients Say"
          description="We are proud to have earned the trust of our clients. Here's what they have to say about our work."
        />
        <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <Reveal key={index} delay={index * 0.1}>
              <TestimonialCard {...testimonial} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};

interface TestimonialCardProps {
  quote: string;
  name: string;
  role: string;
  company: string;
}

const TestimonialCard = ({ quote, name, role, company }: TestimonialCardProps) => {
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <motion.div
      className="glass-card p-8 h-full flex flex-col"
      whileHover={{ y: -8, transition: { duration: 0.3 } }}
    >
      <div className="flex-grow">
        <p className="text-foreground/80 italic">"{quote}"</p>
      </div>
      <div className="mt-6 flex items-center">
        <div className="flex-shrink-0">
          <Avatar className="h-12 w-12 border border-border/50">
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </div>
        <div className="ml-4">
          <p className="text-base font-bold text-foreground">{name}</p>
          <p className="text-sm text-foreground/70">{role}, {company}</p>
        </div>
      </div>
    </motion.div>
  );
};

export default Testimonials;
