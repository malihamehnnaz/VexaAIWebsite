
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
          title: 'Vi börjar med att lyssna',
          description: 'Innan vi föreslår något tar vi oss tid att förstå hur din verksamhet fungerar, var utmaningarna finns och vad framgång faktiskt innebär för dig.',
        },
        {
          icon: <FaLightbulb className="w-8 h-8 text-primary" />,
          title: 'Ingen onödig komplexitet',
          description: 'Den bästa lösningen är den enklaste som fungerar. Vi undviker överkonstruktion och fokuserar på det som verkligen gör skillnad i din vardag.',
        },
        {
          icon: <FaUsers className="w-8 h-8 text-primary" />,
          title: 'Vi arbetar med dig, inte bara för dig',
          description: 'De bästa resultaten uppnås genom samarbete. Vi involverar ditt team genom hela projektet så att lösningen passar naturligt och dina medarbetare känner sig trygga med den.',
        },
        {
          icon: <FaShieldAlt className="w-8 h-8 text-primary" />,
          title: 'Vi stannar kvar efter leveransen',
          description: 'Vårt arbete slutar inte vid lansering. Vi stödjer det vi bygger, lär oss av hur det används och ser till att det fortsätter leverera värde.',
        },
      ]
    : [
        {
          icon: <FaStar className="w-8 h-8 text-primary" />,
          title: 'We start by listening',
          description: 'Before we suggest anything, we take the time to understand how your business works, where the frustrations are, and what success actually looks like for you.',
        },
        {
          icon: <FaLightbulb className="w-8 h-8 text-primary" />,
          title: 'No unnecessary complexity',
          description: 'The best solution is the simplest one that works. We avoid overengineering and focus on what will genuinely make a difference to your team.',
        },
        {
          icon: <FaUsers className="w-8 h-8 text-primary" />,
          title: 'We work with you, not just for you',
          description: 'The best results come from collaboration. We involve your team throughout so the solution fits naturally and your people feel confident using it.',
        },
        {
          icon: <FaShieldAlt className="w-8 h-8 text-primary" />,
          title: 'We stay after the build',
          description: "Our work doesn't end at launch. We support what we build, learn from how it's used, and make sure it keeps delivering value.",
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