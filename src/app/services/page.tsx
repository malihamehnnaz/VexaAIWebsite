"use client";

import ServiceSection from '@/components/features/service-section';
import { useLanguage } from '@/components/common/language-provider';
import { getLocalizedServices, siteCopy } from '@/lib/localization';

export default function ServicesPage() {
  const { language } = useLanguage();
  const copy = siteCopy[language].servicesPage;
  const servicesData = getLocalizedServices(language);

  return (
    <div className="container mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold text-center mb-12">{copy.title}</h1>
      <div className="space-y-16">
        {servicesData.map((service) => (
          <ServiceSection key={service.slug} id={service.slug} {...service} />
        ))}
      </div>
    </div>
  );
}