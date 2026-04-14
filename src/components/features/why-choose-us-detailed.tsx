
'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FaStar, FaLightbulb, FaUsers, FaShieldAlt } from "react-icons/fa";
import { siteCopy } from '@/lib/localization';
import { useLanguage } from '@/components/common/language-provider';

export default function WhyChooseUsDetailed() {
  const { language } = useLanguage();
  const copy = siteCopy[language].about;
  const reasons = language === 'sv'
    ? [
        {
          icon: <FaStar className="w-8 h-8 text-primary" />,
          title: 'Expertis och kvalitet',
          description: 'Vart team bestar av erfarna specialister med dokumenterad formaga att leverera skalbara och robusta losningar med hog kvalitet.',
        },
        {
          icon: <FaLightbulb className="w-8 h-8 text-primary" />,
          title: 'Innovativa losningar',
          description: 'Vi ligger i framkant och anvander de senaste framstegen inom AI och molnteknik for att losa komplexa affarsutmaningar.',
        },
        {
          icon: <FaUsers className="w-8 h-8 text-primary" />,
          title: 'Kundcentrerat arbetssatt',
          description: 'Vi bygger langsiktiga partnerskap med vara kunder och arbetar tillsammans for att forsta behov och leverera skraddarsydda losningar.',
        },
        {
          icon: <FaShieldAlt className="w-8 h-8 text-primary" />,
          title: 'Fortroende och transparens',
          description: 'Vi arbetar med hog integritet, tydlig kommunikation och full transparens genom hela projektets livscykel.',
        },
      ]
    : [
        {
          icon: <FaStar className="w-8 h-8 text-primary" />,
          title: 'Expertise & Excellence',
          description: 'Our team consists of industry veterans with a proven track record of delivering high-quality, scalable, and robust solutions.',
        },
        {
          icon: <FaLightbulb className="w-8 h-8 text-primary" />,
          title: 'Innovative Solutions',
          description: 'We stay at the forefront of technology, leveraging the latest advancements in AI and cloud computing to solve complex business challenges.',
        },
        {
          icon: <FaUsers className="w-8 h-8 text-primary" />,
          title: 'Client-Centric Approach',
          description: 'We believe in building long-term partnerships with our clients, working collaboratively to understand their unique needs and deliver tailored solutions.',
        },
        {
          icon: <FaShieldAlt className="w-8 h-8 text-primary" />,
          title: 'Trust & Transparency',
          description: 'We operate with the utmost integrity, ensuring clear communication, and complete transparency throughout the entire project lifecycle.',
        },
      ];

  return (
    <section className="py-20 bg-secondary/30 dark:bg-secondary/10">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12">{copy.whyChooseUs}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {reasons.map((reason, index) => (
            <Card key={index} className="bg-background border-0 shadow-lg">
              <CardHeader className="flex flex-row items-center gap-4">
                {reason.icon}
                <CardTitle>{reason.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{reason.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}