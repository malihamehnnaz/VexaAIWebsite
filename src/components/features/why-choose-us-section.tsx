
'use client';

import { motion } from 'framer-motion';
import { Zap, ShieldCheck, TrendingUp, Users } from 'lucide-react';
import { useLanguage } from '@/components/common/language-provider';

export default function WhyChooseUsSection() {
  const { language } = useLanguage();
  const copy =
    language === 'sv'
      ? {
          title: 'Varfor valja Vexa AI',
          description: 'Vi fokuserar pa kvalitet, tydlighet och matbara resultat i varje leverans.',
          features: [
            {
              icon: Zap,
              title: 'Snabb och trygg leverans',
              description: 'Vi prioriterar fart och sakerhet sa att ert projekt kan levereras snabbt utan att tumma pa kvalitet eller trygghet.',
            },
            {
              icon: TrendingUp,
              title: 'AI-driven innovation',
              description: 'Vara losningar anpassas efter er verksamhet och anvander AI for att skapa innovation och konkurrensfordelar.',
            },
            {
              icon: ShieldCheck,
              title: 'Transparent projektstyrning',
              description: 'Vi arbetar med tydlig kommunikation och agila arbetssatt sa att ni alltid vet vad som hander och vad som kommer nast.',
            },
            {
              icon: Users,
              title: 'Dedikerad support och forvaltning',
              description: 'Partnerskapet slutar inte vid lansering. Vi stottar er vidare med uppfoljning, support och fortsatt utveckling.',
            },
          ],
        }
      : {
          title: 'Why Choose Vexa AI',
          description: 'We focus on quality, transparency, and measurable business results in every engagement.',
          features: [
            {
              icon: Zap,
              title: 'Fast and Secure Delivery',
              description: 'We prioritize speed and security so your project ships quickly without compromising quality or safety.',
            },
            {
              icon: TrendingUp,
              title: 'AI-Driven Innovation',
              description: 'Our solutions are tailored to your business, using AI to drive innovation and strengthen your competitive edge.',
            },
            {
              icon: ShieldCheck,
              title: 'Transparent Project Management',
              description: 'We use clear communication and agile delivery practices to keep you aligned at every stage.',
            },
            {
              icon: Users,
              title: 'Dedicated Support and Maintenance',
              description: 'Our partnership continues after launch with structured support, optimization, and ongoing improvement.',
            },
          ],
        };

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
              {copy.title}
            </h2>
            <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
              {copy.description}
            </p>
          </div>
        </div>
        <div className="mx-auto mt-12 grid gap-8 md:grid-cols-2">
          {copy.features.map((feature, index) => (
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
