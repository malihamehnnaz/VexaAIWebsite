
'use client';

import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/components/common/language-provider';
import { getLocalizedServices, siteCopy } from '@/lib/localization';
import { iconMap } from '@/components/common/icon-map';

export default function ServicesSection() {
  const { language } = useLanguage();
  const copy = siteCopy[language].home;
  const services = getLocalizedServices(language);

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.5,
        ease: 'easeOut',
      },
    }),
  };

  return (
    <motion.section 
        id="services" 
        className="w-full py-12 md:py-16 lg:py-20 bg-background dark:bg-secondary"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.5 }}
    >
      <div className="container mx-auto max-w-7xl px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="space-y-2">
            <h2 className="font-headline text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-primary">
              {copy.expertiseTitle}
            </h2>
            <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
              {copy.expertiseDescription}
            </p>
          </div>
        </div>
        <div className="mx-auto mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service, i) => {
                const Icon = iconMap[service.icon] ?? iconMap.code;

                return <motion.div
                  key={service.title}
                  custom={i}
                  variants={cardVariants}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.5 }}
                >
                  <Card className="shadow-md hover:shadow-xl transition-shadow duration-300 flex flex-col h-full">
                  <CardHeader className="flex flex-row items-center gap-4">
                      <div className="bg-primary/10 p-3 rounded-full">
                          <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <CardTitle className="font-headline text-lg">{service.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex-grow">
                      <CardDescription>{service.summary}</CardDescription>
                  </CardContent>
                  </Card>
                </motion.div>;
            })}
        </div>
      </div>
    </motion.section>
  );
}
