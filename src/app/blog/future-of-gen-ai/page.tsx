'use client';

import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/components/common/language-provider';
import { getLocale, siteCopy } from '@/lib/localization';

const heroImage = PlaceHolderImages.find(p => p.id === 'blog-post-1');
const inlineImage1 = PlaceHolderImages.find(p => p.id === 'blog-inline-1');
const inlineImage2 = PlaceHolderImages.find(p => p.id === 'blog-inline-2');

const hasImageUrl = <T extends {imageUrl?: string}>(image: T | undefined): image is T & {imageUrl: string} =>
  Boolean(image?.imageUrl);


export default function BlogPostPage() {
  const { language } = useLanguage();
  const locale = getLocale(language);
  const blogCopy = siteCopy[language].blog;
  const content = language === 'sv'
    ? {
        badges: ['Generativ AI', 'Affarsstrategi'],
        title: 'Affarens framtid ar har, och den drivs av generativ AI',
        lead: 'Forestall dig en varld dar ditt foretag inte bara reagerar pa kunders behov utan forutser dem. Dar innehallsskapande inte ar en flaskhals utan ett smidigt, automatiserat flode av kreativitet. Det ar inte science fiction, utan verkligheten som formas av generativ AI.',
        intro: 'Generativ AI ar mer an ett modeord. Det ar en transformativ kraft som skriver om spelreglerna for affarslivet. Fran startups till globala koncerner anvander bolag tekniken for att skapa nya nivaer av effektivitet, personalisering och innovation. Pa Vexa AI ligger vi i framkant av den forandringen.',
        heading1: 'Hyperpersonalisering i stor skala',
        body1: 'I flera ar har personalisering varit marknadsforingens heliga graal. Generativ AI gor det verkligt. Tänk dig att skapa miljontals unika marknadsbudskap, produktrekommendationer och anvandarupplevelser anpassade efter varje individ.',
        heading2: 'Att automatisera den kreativa processen',
        body2: 'Innehall ar kung, men innehallsproduktion kan ta mycket resurser. Generativ AI automatiserar skapandet av blogginlagg, inlagg i sociala medier, produkttexter och annonskopior. Det stannar inte vid text: AI kan nu skapa bilder, video och till och med musik, sa att kreativa team kan fokusera pa strategi.',
        heading3: 'Smartare produkter, smartare beslut',
        body3: 'Generativ AI ar inte bara till for marknadsforing. Tekniken kan byggas in direkt i era produkter, skapa intelligenta applikationer som lar sig och anpassar sig samt rekommenderar atgarder utifran data.',
        heading4: 'Vexa AI-fordelen',
        body4: 'Affarens framtid ar intelligent, automatiserad och starkt personaliserad. Generativ AI ar motorn bakom den forandringen, och bolag som omfamnar den idag blir morgondagens ledare.',
        body5: 'Pa Vexa AI erbjuder vi expertis och verktyg som hjalper er att integrera generativ AI i verksamheten. Oavsett om det handlar om en skraddarsydd chatbot, en motor for innehallsgenerering eller en hel AI-produkt har vi losningarna som hjalper er att lyckas.',
      }
    : {
        badges: ['Generative AI', 'Business Strategy'],
        title: "The Future of Business is Here, and It's Powered by Generative AI",
        lead: 'Imagine a world where your business does not just respond to customer needs but anticipates them. A world where content creation is not a bottleneck but a seamless, automated flow of creativity. This is not science fiction; it is the reality being shaped by Generative AI.',
        intro: 'Generative AI is more than a buzzword; it is a transformative force rewriting the rules of business. From startups to global enterprises, companies are using it to unlock new levels of efficiency, personalization, and innovation. At Vexa AI, we are at the forefront of that shift.',
        heading1: 'Hyper-Personalization at Scale',
        body1: 'For years, personalization has been the holy grail of marketing. Generative AI makes it real. Imagine creating millions of unique marketing messages, product recommendations, and user experiences tailored to each individual.',
        heading2: 'Automating the Creative Process',
        body2: 'Content is king, but producing it can drain resources. Generative AI changes the game by automating blog posts, social media updates, product descriptions, ad copy, images, video, and more, freeing creative teams to focus on strategy.',
        heading3: 'Smarter Products, Smarter Decisions',
        body3: 'Generative AI is not just for marketing and content. It can be embedded into products to create intelligent applications that learn, adapt, surface insights, and recommend actions.',
        heading4: 'The Vexa AI Advantage',
        body4: 'The future of business is intelligent, automated, and highly personalized. Generative AI is the engine driving that change, and the companies that embrace it today will lead tomorrow.',
        body5: 'At Vexa AI, we provide the expertise and tools to help you integrate Generative AI into your business. Whether it is a custom chatbot, a content generation engine, or a fully AI-powered application, we have the solutions to help you thrive.',
      };

  return (
    <article className="w-full">
      <header className="relative h-[60vh] min-h-[400px] w-full flex items-end justify-center text-center text-white">
        {hasImageUrl(heroImage) && (
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

          {hasImageUrl(inlineImage1) && (
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

           {hasImageUrl(inlineImage2) && (
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
          
          <h2>{content.heading4}</h2>
          <p>
            {content.body4}
          </p>
          <p>
            {content.body5}
          </p>
        </div>
      </div>
    </article>
  );
}
