
'use client';

import { motion } from 'framer-motion';
import { CheckCircle, Zap, ShieldCheck, TrendingUp, Users } from 'lucide-react';

const features = [
  {
    icon: Zap,
    title: 'Fastest, Most Secure Delivery',
    description: 'We prioritize speed and security, ensuring your project is delivered quickly without compromising on quality or safety.',
  },
  {
    icon: TrendingUp,
    title: 'AI-Driven Innovation',
    description: 'Our solutions are tailored to your business, leveraging AI to drive innovation and give you a competitive edge.',
  },
  {
    icon: ShieldCheck,
    title: 'Transparent Project Management',
    description: 'We believe in clear communication and agile methodologies to keep you in the loop every step of the way.',
  },
  {
    icon: Users,
    title: 'Dedicated Support & Maintenance',
    description: 'Our partnership doesn’t end at launch. We provide dedicated support and maintenance to ensure your success.',
  },
];

export default function WhyChooseUsSection() {
  return (
    <motion.section 
        id="why-us" 
        className="w-full py-12 md:py-16 lg:py-20 bg-secondary"
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.5 }}
    >
      <div className="container mx-auto max-w-7xl px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="space-y-2">
            <h2 className="font-headline text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-primary">
              Why Choose VexaAI
            </h2>
            <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
              We are committed to delivering excellence and driving results for your business.
            </p>
          </div>
        </div>
        <div className="mx-auto mt-12 grid gap-8 md:grid-cols-2">
          {features.map((feature, index) => (
            <div key={index} className="flex items-start gap-4">
              <div className="bg-primary/10 p-3 rounded-full">
                <feature.icon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-bold">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}
