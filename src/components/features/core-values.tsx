
'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { siteCopy } from '@/lib/localization';
import { useLanguage } from '@/components/common/language-provider';

export default function CoreValues() {
  const { language } = useLanguage();
  const copy = siteCopy[language].about;
  const values = language === 'sv'
    ? [
        { title: 'Innovation', description: 'Vi soker ständigt nya och battre satt att losa problem och skapa varde.' },
        { title: 'Integritet', description: 'Vi ar arliga, transparenta och engagerade i att gora det som ar bast for vara kunder.' },
        { title: 'Samarbete', description: 'Vi arbetar tillsammans, med vara kunder och partners, for att na gemensamma mal.' },
        { title: 'Kvalitet', description: 'Vi ar dedikerade till att leverera arbete av hogsta kvalitet och overtraffa forvantningar.' },
        { title: 'Effekt', description: 'Vi drivs av viljan att skapa en positiv och langsiktig effekt i varlden.' },
        { title: 'Larande', description: 'Vi ar livslanga larande personer som alltid ar nyfikna och vill utveckla var kunskap.' },
      ]
    : [
        { title: 'Innovation', description: 'We constantly seek new and better ways to solve problems and create value.' },
        { title: 'Integrity', description: 'We are honest, transparent, and committed to doing what is best for our clients.' },
        { title: 'Collaboration', description: 'We work together, with our clients and partners, to achieve shared goals.' },
        { title: 'Excellence', description: 'We are dedicated to delivering the highest quality work and exceeding expectations.' },
        { title: 'Impact', description: 'We are driven by the desire to make a positive and lasting impact on the world.' },
        { title: 'Learning', description: 'We are lifelong learners, always curious and eager to grow our knowledge and skills.' },
      ];

  return (
    <section className="py-20 bg-secondary/30 dark:bg-secondary/10">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12">{copy.coreValues}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {values.map((value, index) => (
            <Card key={index} className="text-center bg-background border-0 shadow-lg">
              <CardHeader>
                <CardTitle>{value.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{value.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}