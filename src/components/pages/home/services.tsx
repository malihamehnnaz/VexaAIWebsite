'use client';

import SectionHeading from '@/components/common/section-heading';
import { services } from '@/content/site-content';
import { motion } from 'framer-motion';
import Reveal from '@/components/common/reveal';
import { iconMap } from '@/components/common/icon-map';

const Services = () => {
  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <SectionHeading
          title="Our Expertise"
          description="We provide a wide range of services to help you achieve your business goals."
        />
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <Reveal key={index} delay={index * 0.1}>
              <ServiceCard
                icon={service.icon}
                title={service.title}
                description={service.description}
              />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};

interface ServiceCardProps {
  icon: string;
  title: string;
  description: string;
}

const ServiceCard = ({ icon, title, description }: ServiceCardProps) => {
  const Icon = iconMap[icon] ?? iconMap.code;
  return (
    <motion.div
      className="glass-card p-8 h-full"
      whileHover={{ y: -8, transition: { duration: 0.3 } }}
    >
      <div className="flex-shrink-0">
        <div className="flex items-center justify-center h-12 w-12 rounded-md bg-primary/10 text-primary">
          <Icon className="h-6 w-6" aria-hidden="true" />
        </div>
      </div>
      <div className="mt-6">
        <h3 className="text-xl font-bold text-foreground">{title}</h3>
        <p className="mt-2 text-base text-foreground/70">{description}</p>
      </div>
    </motion.div>
  );
};

export default Services;
