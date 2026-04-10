'use client';

import SectionHeading from '@/components/common/section-heading';
import {
  SiNextdotjs,
  SiReact,
  SiTypescript,
  SiNodedotjs,
  SiPython,
  SiGooglecloud,
  SiFirebase,
  SiDocker,
  SiKubernetes,
  SiPostgresql,
  SiMongodb,
  SiGraphql,
} from 'react-icons/si';
import { FaAws } from 'react-icons/fa';
import { motion } from 'framer-motion';
import Reveal from '@/components/common/reveal';

const tech = [
  { name: 'Next.js', icon: SiNextdotjs },
  { name: 'React', icon: SiReact },
  { name: 'TypeScript', icon: SiTypescript },
  { name: 'Node.js', icon: SiNodedotjs },
  { name: 'Python', icon: SiPython },
  { name: 'Google Cloud', icon: SiGooglecloud },
  { name: 'AWS', icon: FaAws },
  { name: 'Firebase', icon: SiFirebase },
  { name: 'Docker', icon: SiDocker },
  { name: 'Kubernetes', icon: SiKubernetes },
  { name: 'PostgreSQL', icon: SiPostgresql },
  { name: 'MongoDB', icon: SiMongodb },
  { name: 'GraphQL', icon: SiGraphql },
];

const TechStack = () => {
  return (
    <section className="py-14 md:py-16 bg-background">
      <div className="container mx-auto px-4">
        <SectionHeading
          title="Our Technology Stack"
          description="We use the best and most modern technologies to build our solutions."
          className="space-y-3"
        />
        <Reveal>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-6 md:gap-8">
            {tech.map((item, index) => (
              <motion.div
                key={index}
                className="flex flex-col items-center gap-2 text-foreground/70"
                whileHover={{ scale: 1.1, color: 'hsl(var(--primary))' }}
              >
                <item.icon className="h-10 w-10" />
                <span className="text-sm font-medium">{item.name}</span>
              </motion.div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
};

export default TechStack;
