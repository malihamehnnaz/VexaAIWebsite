
'use client';

import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/components/common/language-provider';
import { getLocale, siteCopy } from '@/lib/localization';

const heroImage = PlaceHolderImages.find(p => p.id === 'blog-post-3');
const inlineImage1 = PlaceHolderImages.find(p => p.id === 'cloud-inline-1');
const inlineImage2 = PlaceHolderImages.find(p => p.id === 'cloud-inline-2');

export default function BlogPostPage() {
  const { language } = useLanguage();
  const locale = getLocale(language);
  const blogCopy = siteCopy[language].blog;
  const content = language === 'sv'
    ? {
        badges: ['Molntjanster', 'Affarsstrategi'],
        title: 'Ar ditt foretag redo for molnet?',
        lead: 'Molnet ar inte langre en framtidsvision, utan grunden i modern affarsdrift. En flytt till molnet ger stora fordelar i skalbarhet, kostnadseffektivitet och innovation. Men ar verksamheten verkligen redo?',
        intro: 'En lyckad molnmigrering ar mer an en teknisk forflyttning. Den kraver planering, tydlig strategi och en djup forstaelse for verksamhetens behov. Pa Vexa AI hjalper vi foretag genom den resan for att sakerstalla en smidig och framgangsrik overgång.',
        heading1: 'Viktiga fordelar med molnmigrering',
        body1: 'Att flytta till molnet kan skapa betydande fordelar. Ni betalar bara for de resurser ni anvander, minskar stora investeringar i fysisk infrastruktur och far en plattform som kan vaxa med verksamheten. Molnet forbattrar ocksa samarbete och erbjuder starka alternativ for disaster recovery.',
        heading2: 'Att utveckla en molnstrategi',
        body2: 'Innan migreringen bor ni utvardera er nuvarande IT-miljo och definiera tydliga mal. Vad vill ni uppna? Lagre kostnader, hogre flexibilitet eller battre prestanda? Strategin bor beskriva vilka applikationer som flyttas, vilken molnmodell som passar och om publik, privat eller hybrid moln ar bast utifran krav pa sakerhet och compliance.',
        bullets: [
          '<strong>Kartlagg arbetslaster:</strong> Alla applikationer ar inte redo for molnet. Identifiera vilka system som far mest varde av en migrering och vilka som behover moderniseras eller avvecklas.',
          '<strong>Valj ratt leverantor:</strong> AWS, Google Cloud och Azure har olika styrkor. Valet ska utga fran era tekniska krav och er budget.',
          '<strong>Planera for sakerhet:</strong> Sakerhet i molnet ar ett delat ansvar. Implementera tydlig accesskontroll, kryptering och overvaking for att skydda data.',
        ],
        heading3: 'Vexa AIs molnresa',
        body3: 'Pa Vexa AI forenklar vi det komplexa i molnmigrering. Vara experter arbetar med er for att skapa en skraddarsydd roadmap, fran initial analys till optimering efter flytten. Vi ser till att molnmiljon ar saker, kostnadseffektiv och helt i linje med era affarsmal.',
        body4: 'Att ta steget till molnet ar centralt for att framtidssakra verksamheten. Med ratt partner och en stark strategi kan ni oppna en ny era av flexibilitet och innovation.',
      }
    : {
        badges: ['Cloud Services', 'Business Strategy'],
        title: 'Is Your Business Ready for the Cloud?',
        lead: 'The cloud is no longer a futuristic concept; it is the bedrock of modern business operations. Migrating to the cloud offers unparalleled advantages in scalability, cost-efficiency, and innovation. But is your business truly prepared to make the leap?',
        intro: 'A successful cloud migration is more than just a technical shift. It requires careful planning, a clear strategy, and a deep understanding of your business needs. At Vexa AI, we guide businesses through this transformation to ensure a seamless and successful transition.',
        heading1: 'Key Benefits of Cloud Migration',
        body1: 'Moving to the cloud can unlock significant benefits. It allows you to pay only for the resources you use, reduce capital expenditure on hardware, and scale infrastructure with demand. It also enhances collaboration and strengthens disaster recovery capabilities.',
        heading2: 'Developing a Cloud Strategy',
        body2: 'Before migrating, it is crucial to assess your current IT landscape and define clear objectives. What are you trying to achieve? Lower costs, greater agility, or better performance? Your strategy should outline which applications to move, the right cloud model to adopt, and whether a public, private, or hybrid cloud is the best fit.',
        bullets: [
          '<strong>Assess Your Workloads:</strong> Not all applications are cloud-ready. Identify which systems will benefit most from migration and which may need modernization or retirement.',
          '<strong>Choose the Right Provider:</strong> AWS, Google Cloud, and Azure each have different strengths. Your choice should align with your technical needs and budget.',
          '<strong>Plan for Security:</strong> Cloud security is a shared responsibility. Use strong access controls, encryption, and monitoring to protect your data.',
        ],
        heading3: 'The Vexa AI Cloud Journey',
        body3: 'At Vexa AI, we simplify the complexities of cloud migration. Our experts work with you to create a tailored roadmap, from initial assessment to post-migration optimization. We ensure your cloud environment is secure, cost-effective, and aligned with your business goals.',
        body4: 'Moving to the cloud is a critical step toward future-proofing your business. With the right partner and a strong strategy, you can unlock a new era of agility and innovation.',
      };

  return (
    <article className="w-full">
      <header className="relative h-[60vh] min-h-[400px] w-full flex items-end justify-center text-center text-white">
        {heroImage && heroImage.imageUrl && (
          <Image
            src={heroImage.imageUrl}
            alt={heroImage.description}
            fill
            className="object-cover"
            priority
            data-ai-hint={heroImage.imageHint}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent" />
        <div className="relative z-10 container px-4 md:px-6 pb-12">
          <div className="flex flex-col items-center space-y-4">
            <div className="flex gap-2">
                {content.badges.map((badge) => (
                  <Badge key={badge} variant="secondary">{badge}</Badge>
                ))}
            </div>
            <h1 className="font-headline text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl">
              {content.title}
            </h1>
            <div className="flex items-center gap-4 pt-4">
                <Avatar>
                    <AvatarFallback>VAI</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{blogCopy.byTeam}</p>
                  <p className="text-sm text-gray-300">{blogCopy.publishedOn} {new Date().toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto max-w-4xl py-16 md:py-24 px-4 md:px-6">
        <div className="prose prose-lg dark:prose-invert mx-auto">
          <p className="lead">
            {content.lead}
          </p>
          <p>
            {content.intro}
          </p>

          {inlineImage1 && inlineImage1.imageUrl && (
            <div className="my-8 rounded-lg overflow-hidden shadow-xl">
                 <Image
                    src={inlineImage1.imageUrl}
                    alt={inlineImage1.description}
                    width={1200}
                    height={800}
                    className="aspect-[3/2] object-cover"
                    data-ai-hint={inlineImage1.imageHint}
                />
            </div>
          )}
          
          <h2>{content.heading1}</h2>
          <p>
            {content.body1}
          </p>
          
          <h2>{content.heading2}</h2>
          <p>
            {content.body2}
          </p>
          <ul>
            {content.bullets.map((bullet) => (
              <li key={bullet} dangerouslySetInnerHTML={{ __html: bullet }} />
            ))}
          </ul>

          {inlineImage2 && inlineImage2.imageUrl && (
             <div className="my-8 rounded-lg overflow-hidden shadow-xl">
                <Image
                    src={inlineImage2.imageUrl}
                    alt={inlineImage2.description}
                    width={1200}
                    height={800}
                    className="aspect-[3/2] object-cover"
                    data-ai-hint={inlineImage2.imageHint}
                />
            </div>
          )}

          <h2>{content.heading3}</h2>
          <p>
            {content.body3}
          </p>
          <p>
            {content.body4}
          </p>
        </div>
      </div>
    </article>
  );
}
