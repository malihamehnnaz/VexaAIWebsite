
'use client';

import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/components/common/language-provider';
import { getLocale, siteCopy } from '@/lib/localization';

const heroImage = PlaceHolderImages.find(p => p.id === 'blog-post-4');
const inlineImage1 = PlaceHolderImages.find(p => p.id === 'blog-inline-3');
const inlineImage2 = PlaceHolderImages.find(p => p.id === 'blog-inline-4');

export default function BlogPostPage() {
  const { language } = useLanguage();
  const locale = getLocale(language);
  const blogCopy = siteCopy[language].blog;
  const content = language === 'sv'
    ? {
        badges: ['AI-agenter', 'Affärsautomation'],
        title: 'Nästa steg: så automatiserar agentisk AI affären',
        lead: 'Vi har passerat enkel automation. Eran med agentisk AI är här, där intelligenta, autonoma system inte bara följer instruktioner utan resonerar, planerar och utför komplexa uppgifter för att nå ett mål.',
        intro: 'I flera år har automation handlat om skript och fasta flöden. Men vad händer när processen inte är linjär? När den kräver beslut, datainsamling från flera källor och anpassning till nya omständigheter? Där kommer agentiska lösningar in som digitala medarbetare för era mest komplexa operativa behov.',
        heading1: 'Vad är AI-agenter?',
        body1: 'Tänk på en AI-agent som ett autonomt system skapat för att nå ett specifikt mål. Du ger den inte en steg-för-steg-plan, utan ett uppdrag. Till exempel kan du istället för att programmera ett skript att hämta data och skicka den vidare be agenten att sammanfatta försäljningen för senaste kvartalet med regional fördelning och viktiga drivkrafter. Agenten avgör sedan själv vilka källor som ska användas och hur resultatet ska presenteras.',
        heading2: 'Operativ effektivitet på riktigt',
        body2: 'Agentisk AI är en game changer för affärsautomation. Den kan hantera dynamiska processer i flera steg som tidigare varit för komplexa för traditionell automation. Exempel:',
        bullets: [
          '<strong>Optimering av leveranskedjan:</strong> En agent övervakar lagernivåer, leverantörsförseningar och efterfrågan i realtid och kan automatiskt styra om leveranser och justera ordrar.',
          '<strong>Personlig kundsupport:</strong> En agent hanterar ett kundärende från start till mål, med tillgång till orderhistorik, kunskapskällor och bokning av uppföljning utan manuell handpåverkan.',
          '<strong>Automatiserad marknadsanalys:</strong> En agent kan få uppdraget att kartlägga konkurrenslandskapet för en ny produkt och sedan samla information, analysera sajter och leverera en sammanfattande rapport.',
        ],
        heading3: 'Vexa AIs arbetssätt för agentiska lösningar',
        body3: 'På Vexa AI bygger vi inte bara chatbots utan autonoma arbetsstyrkor. Vi fokuserar på robusta och tillförlitliga AI-agenter som integreras med era befintliga system. Tillsammans identifierar vi högvärdiga automationsområden, definierar agenternas mål och kapacitet och lanserar lösningar som ger mätbar ROI.',
        body4: 'Framtidens arbete handlar inte om att ersätta människor utan om att förstärka dem. Genom att låta AI-agenter ta hand om komplexa, repetitiva och dataintensiva uppgifter frigörs tid för strategi, kreativitet och relationer. Välkommen till den digitala medarbetarens tidsålder.',
      }
    : {
        badges: ['AI Agents', 'Business Automation'],
        title: 'The Next Frontier: How Agentic AI is Automating Business',
        lead: "We've moved beyond simple automation. The era of agentic AI is here, where intelligent, autonomous systems don't just follow instructions—they reason, plan, and execute complex tasks to achieve goals. This is business automation on a whole new level.",
        intro: 'For years, automation has been about scripts and predefined workflows. But what happens when the process is not linear? What if it requires decision-making, data gathering from multiple sources, and adapting to unforeseen circumstances? This is where agentic solutions come in, acting as digital employees for your most complex operational needs.',
        heading1: 'What Are AI Agents?',
        body1: 'Think of an AI agent as an autonomous system designed to achieve a specific goal. You do not give it a step-by-step plan; you give it an objective. For example, instead of programming a script to extract data from multiple systems and forward it, you tell an AI agent to summarize last quarter\'s sales performance, including regional breakdowns and key drivers. The agent then figures out how to retrieve, synthesize, and present that information.',
        heading2: 'Unlocking True Operational Efficiency',
        body2: 'Agentic AI is a game-changer for business automation. It can handle dynamic, multi-step processes that were previously too complex for traditional automation. Consider these use cases:',
        bullets: [
          '<strong>Supply Chain Optimization:</strong> An agent monitors inventory levels, supplier delays, and market demand in real time, automatically re-routing shipments and adjusting orders to prevent stockouts.',
          '<strong>Personalized Customer Support:</strong> An agent manages a customer query from start to finish, accessing order history, knowledge bases, and follow-up workflows without constant human intervention.',
          '<strong>Automated Market Research:</strong> An agent can research a competitive landscape, analyze multiple sources, summarize findings, and deliver a usable report.',
        ],
        heading3: 'The Vexa AI Approach to Agentic Solutions',
        body3: 'At Vexa AI, we do not just build chatbots; we build autonomous workforces. Our approach focuses on creating robust, reliable AI agents that integrate seamlessly with your existing systems. We work with you to identify high-impact areas for automation, design the agent\'s goals and capabilities, and deploy a solution that delivers measurable ROI.',
        body4: 'The future of work is not about replacing humans but augmenting them. By delegating complex, repetitive, and data-intensive tasks to AI agents, you free up your team to focus on strategy, creativity, and relationships. Welcome to the age of the digital employee.',
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
