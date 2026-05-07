import {
  blogPosts,
  caseStudies,
  companyContact,
  companyStats,
  services,
  solutions,
  teamMembers,
  testimonials,
  type BlogPost,
  type CaseStudyItem,
  type CompanyContact,
  type ServiceItem,
  type SolutionItem,
  type TeamMember,
  type Testimonial,
} from '@/content/site-content';

export type Language = 'en' | 'sv';

export type LocalizedText = {
  en: string;
  sv: string;
};

export const languageOptions: Array<{
  value: Language;
  label: string;
  nativeLabel: string;
  flag: string;
}> = [
  { value: 'sv', label: 'Swedish', nativeLabel: 'Svenska', flag: '🇸🇪' },
  { value: 'en', label: 'English', nativeLabel: 'English', flag: '🇦🇺' },
];

export function getLocale(language: Language) {
  return language === 'sv' ? 'sv-SE' : 'en-AU';
}

export function pickText(language: Language, text: LocalizedText) {
  return text[language];
}

export const siteCopy = {
  en: {
    nav: {
      home: 'Home',
      about: 'About',
      services: 'Services',
      solutions: 'Solutions',
      caseStudies: 'Case Studies',
      blog: 'Blog',
      contact: 'Contact',
      contactUs: 'Contact Us',
      toggleMenu: 'Toggle menu',
    },
    footer: {
      intro:
        'Vexa AI builds premium AI products, enterprise software, and cloud platforms designed for growth.',
      startProject: 'Start a project',
      viewSolutions: 'View solutions',
      navigate: 'Navigate',
      contact: 'Contact',
      rights: 'All rights reserved.',
      privacy: 'Privacy',
      terms: 'Terms',
    },
    theme: {
      toggle: 'Toggle theme',
      light: 'Light',
      dark: 'Dark',
      system: 'System',
    },
    home: {
      heroBadge: 'Built around how your business works',
      heroTitle: 'Your business is unique.',
      heroTitleAccent: 'Your AI should be too.',
      heroDescription:
        'We start with a conversation about how you work, then build the solution around it. No templates. No guesswork. Just technology that actually fits.',
      startProject: 'Start Your Project',
      seeSolutions: 'See Solutions',
      card1Title: 'We listen first',
      card1Body: 'No assumptions. We map your workflows and goals before suggesting anything.',
      card2Title: 'We design together',
      card2Body: 'You know your business. We know the technology. Together we build the right thing.',
      card3Title: 'We deliver and stay',
      card3Body: "We build it, support it, and keep improving it with you.",
      cloudFoundations: 'Cloud + data foundations',
      liveCopilots: 'AI assistants that actually work',
      expertiseTitle: 'Our Expertise',
      expertiseDescription:
        'We provide a wide range of services to help you achieve your business goals.',
      solutionsTitle: 'Tailored Solutions for Your Industry',
      solutionsDescription:
        'We deliver solutions that are specifically designed to meet the unique challenges of your sector.',
      learnMore: 'Learn More',
      testimonialsTitle: 'What Our Clients Say',
      testimonialsDescription:
        "We are proud to have earned the trust of our clients. Here's what they have to say about our work.",
      successTitle: 'Proven Success Stories',
      successDescription:
        "Explore how we've helped our clients overcome their challenges and achieve their goals.",
      viewAllCaseStudies: 'View All Case Studies',
      readCaseStudy: 'Read Case Study',
      stackTitle: 'Our Technology Stack',
      stackDescription:
        'We use the best and most modern technologies to build our solutions.',
      ctaTitle: 'Ready to Start Your Next Project?',
      ctaDescription:
        "Let's build something amazing together. Contact us to discuss your ideas and how we can help you achieve your goals.",
      getInTouch: 'Get in Touch',
    },
    about: {
      missionTitle: 'Our Mission',
      missionDescription:
        "Our mission is simple: eliminate the work that shouldn't require your attention. We automate the repetitive so your team can stay focused on strategy, creativity, and growth. Our vision is a future where AI doesn't replace what makes us human — it protects it.",
      whyChooseUs: 'Why Choose Us',
      coreValues: 'Our Core Values',
      leadership: 'Leadership',
      meetTeam: 'Meet our core team',
      teamDescription:
        'The leadership behind Vexa AI brings together business vision, technology execution, and operational discipline.',
    },
    servicesPage: {
      title: 'Our Services',
      keyBenefits: 'Key Benefits',
      useCases: 'Example Use Cases',
      technologies: 'Technologies We Use',
    },
    solutionsPage: {
      title: 'Our Solutions',
      problem: 'The Problem',
      solution: 'Our Solution',
      impact: 'The Impact',
      aiSolution: 'AI solution',
      fallbackDescription:
        'A focused solution card without supporting imagery, keeping the section clean and editorial.',
    },
    caseStudiesPage: {
      title: 'Case Studies',
      sector: 'Sector',
      problem: 'Problem',
      solution: 'Solution',
      keyMetrics: 'Key Metrics',
      techStack: 'Tech Stack',
    },
    contactPage: {
      title: 'Contact Us',
      description:
        'Talk to Vexa AI about product strategy, intelligent automation, software delivery, and cloud transformation.',
      getInTouch: 'Get in Touch',
      body:
        'Have a project in mind or need guidance on enterprise AI, software, or cloud transformation? Reach out and we’ll get back to you as soon as possible.',
      officeLocation: 'Office Location',
      liveLocation: 'Live location',
      openInMap: 'Open in map',
    },
    form: {
      title: 'Send us a Message',
      name: 'Name',
      company: 'Company (Optional)',
      email: 'Email',
      message: 'Message',
      namePlaceholder: 'Your Name',
      companyPlaceholder: 'Your Company',
      emailPlaceholder: 'Your Email',
      messagePlaceholder: 'How can we help you?',
      submit: 'Send Message',
      validationName: 'Name must be at least 2 characters.',
      validationEmail: 'Please enter a valid email address.',
      validationMessage: 'Message must be at least 10 characters.',
    },
    blog: {
      eyebrow: 'Insights',
      title: 'Professional thinking on AI, systems, and modern delivery',
      description:
        'Executive perspectives, technical breakdowns, and practical guidance for teams building with AI, software platforms, and cloud infrastructure.',
      readArticle: 'Read article',
      editorial: 'Editorial',
      backToInsights: 'Back to insights',
      publishedOn: 'Published on',
      byTeam: 'By the Vexa AI team',
      notFound: 'Post not found',
    },
    chatbot: {
      title: 'AI Assistant',
      description: 'Your Vexa AI sales and discovery assistant',
      placeholder: 'Tell me what you want to build...',
      initialMessage:
        "Hello! I'm Vexa's sales assistant. I can help you define your needs, suggest services, ask clarifying questions, and prepare a basic quotation.",
      error:
        "Sorry, I'm having trouble connecting. Please try again later.",
      prompts: [
        'We need an AI chatbot for customer support. Where should we start?',
        'Can you recommend services for cloud migration and DevOps automation?',
        'Can you prepare a quote if our deployment is Azure and expected API traffic is 20k/day?',
      ],
    },
  },
  sv: {
    nav: {
      home: 'Hem',
      about: 'Om oss',
      services: 'Tjänster',
      solutions: 'Lösningar',
      caseStudies: 'Case',
      blog: 'Blogg',
      contact: 'Kontakt',
      contactUs: 'Kontakta oss',
      toggleMenu: 'Öppna meny',
    },
    footer: {
      intro:
        'Vexa AI bygger avancerade AI-produkter, affärskritiska system och molnplattformar som är skapade för tillväxt.',
      startProject: 'Starta ett projekt',
      viewSolutions: 'Se lösningar',
      navigate: 'Navigera',
      contact: 'Kontakt',
      rights: 'Alla rättigheter förbehållna.',
      privacy: 'Integritet',
      terms: 'Villkor',
    },
    theme: {
      toggle: 'Byt tema',
      light: 'Ljust',
      dark: 'Mörkt',
      system: 'System',
    },
    home: {
      heroBadge: 'Byggt kring hur din verksamhet fungerar',
      heroTitle: 'Din verksamhet är unik.',
      heroTitleAccent: 'Din AI bör vara det också.',
      heroDescription:
        'Vi börjar med ett samtal om hur du arbetar, sedan bygger vi lösningen kring det. Inga mallar. Inga gissningar. Bara teknik som faktiskt passar.',
      startProject: 'Starta ditt projekt',
      seeSolutions: 'Se lösningar',
      card1Title: 'Vi lyssnar först',
      card1Body: 'Inga antaganden. Vi kartlägger dina flöden och mål innan vi föreslår något.',
      card2Title: 'Vi designar tillsammans',
      card2Body: 'Du känner din verksamhet. Vi känner tekniken. Tillsammans bygger vi rätt sak.',
      card3Title: 'Vi levererar och stannar',
      card3Body: 'Vi bygger det, stödjer det och förbättrar det löpande med dig.',
      cloudFoundations: 'Moln- och datafundament',
      liveCopilots: 'AI-assistenter som faktiskt fungerar',
      expertiseTitle: 'Vår expertis',
      expertiseDescription:
        'Vi erbjuder ett brett spektrum av tjänster som hjälper er att nå era affärsmål.',
      solutionsTitle: 'Skräddarsydda lösningar för er bransch',
      solutionsDescription:
        'Vi levererar lösningar som är utformade för att möta just er sektors unika utmaningar.',
      learnMore: 'Läs mer',
      testimonialsTitle: 'Vad våra kunder säger',
      testimonialsDescription:
        'Vi är stolta över att ha förtjänat våra kunders förtroende. Här är vad de säger om vårt arbete.',
      successTitle: 'Bevisade framgångshistorier',
      successDescription:
        'Se hur vi har hjälpt våra kunder att övervinna utmaningar och nå sina mål.',
      viewAllCaseStudies: 'Se alla case',
      readCaseStudy: 'Läs case',
      stackTitle: 'Vår teknikstack',
      stackDescription:
        'Vi använder de bästa och mest moderna teknikerna för att bygga våra lösningar.',
      ctaTitle: 'Redo att starta ert nästa projekt?',
      ctaDescription:
        'Låt oss bygga något fantastiskt tillsammans. Kontakta oss för att diskutera era idéer och hur vi kan hjälpa er att nå era mål.',
      getInTouch: 'Kontakta oss',
    },
    about: {
      missionTitle: 'Vårt uppdrag',
      missionDescription:
        'Vårt uppdrag är enkelt: ta bort arbetet som inte borde kräva din uppmärksamhet. Vi automatiserar det repetitiva så att ditt team kan fokusera på strategi, kreativitet och tillväxt. Vår vision är en framtid där AI inte ersätter det som gör oss mänskliga — den skyddar det.',
      whyChooseUs: 'Varför välja oss',
      coreValues: 'Våra kärnvärden',
      leadership: 'Ledning',
      meetTeam: 'Möt vårt kärnteam',
      teamDescription:
        'Ledningen bakom Vexa AI kombinerar affärsvision, tekniskt genomförande och operativ disciplin.',
    },
    servicesPage: {
      title: 'Våra tjänster',
      keyBenefits: 'Viktiga fördelar',
      useCases: 'Exempel på användningsfall',
      technologies: 'Tekniker vi använder',
    },
    solutionsPage: {
      title: 'Våra lösningar',
      problem: 'Utmaningen',
      solution: 'Vår lösning',
      impact: 'Effekten',
      aiSolution: 'AI-lösning',
      fallbackDescription:
        'Ett fokuserat lösningskort utan stödbild, för att hålla sektionen ren och redaktionell.',
    },
    caseStudiesPage: {
      title: 'Case',
      sector: 'Bransch',
      problem: 'Utmaning',
      solution: 'Lösning',
      keyMetrics: 'Nyckeltal',
      techStack: 'Teknikstack',
    },
    contactPage: {
      title: 'Kontakta oss',
      description:
        'Prata med Vexa AI om produktstrategi, intelligent automatisering, systemleverans och molntransformation.',
      getInTouch: 'Hör av er',
      body:
        'Har ni ett projekt i åtanke eller behov av vägledning inom enterprise-AI, systemutveckling eller molntransformation? Hör av er så återkommer vi så snart som möjligt.',
      officeLocation: 'Kontorsadress',
      liveLocation: 'Live-position',
      openInMap: 'Öppna i karta',
    },
    form: {
      title: 'Skicka ett meddelande',
      name: 'Namn',
      company: 'Företag (valfritt)',
      email: 'E-post',
      message: 'Meddelande',
      namePlaceholder: 'Ditt namn',
      companyPlaceholder: 'Ditt företag',
      emailPlaceholder: 'Din e-post',
      messagePlaceholder: 'Hur kan vi hjälpa dig?',
      submit: 'Skicka meddelande',
      validationName: 'Namnet måste vara minst 2 tecken.',
      validationEmail: 'Ange en giltig e-postadress.',
      validationMessage: 'Meddelandet måste vara minst 10 tecken.',
    },
    blog: {
      eyebrow: 'Insikter',
      title: 'Tankar om AI, system och modern leverans',
      description:
        'Perspektiv för ledare, tekniska genomgångar och praktisk vägledning för team som bygger med AI, mjukvara och molninfrastruktur.',
      readArticle: 'Läs artikel',
      editorial: 'Redaktionellt',
      backToInsights: 'Tillbaka till insikter',
      publishedOn: 'Publicerad',
      byTeam: 'Av Vexa AI-teamet',
      notFound: 'Artikeln hittades inte',
    },
    chatbot: {
      title: 'AI-assistent',
      description: 'Din sälj- och behovsassistent för Vexa AI',
      placeholder: 'Berätta vad ni vill bygga...',
      initialMessage:
        'Hej! Jag är Vexas säljassistent. Jag hjälper er att kartlägga behov, föreslå tjänster, ställa följdfrågor och ta fram en grundoffert.',
      error:
        'Tyvärr har jag problem att ansluta just nu. Försök igen senare.',
      prompts: [
        'Vi behöver en AI-chatbot för kundsupport. Hur börjar vi?',
        'Kan du föreslå tjänster för molnmigrering och DevOps-automation?',
        'Kan du skapa en offert om vi kör på Azure och väntar cirka 20k API-anrop per dag?',
      ],
    },
  },
} as const;

const localizedCompanyStats = {
  sv: [
    { value: '40%', label: 'mindre tid på repetitivt, manuellt arbete' },
    { value: '99.95%', label: 'drifttid för de lösningar vi bygger och stödjer' },
    { value: '12 veckor', label: 'från första samtal till en fungerande lösning' },
    { value: '24/7', label: 'automatiserad täckning så ditt team kan fokusera på det viktiga' },
  ],
};

const localizedServices = {
  sv: [
    {
      slug: 'custom-software-development',
      title: 'Skräddarsydd systemutveckling',
      summary: 'Färdigpaketerade verktyg passar inte alltid. Vi bygger programvara som är utformad kring hur din verksamhet faktiskt fungerar.',
      description: 'När befintliga system skapar fler omvägar än lösningar är det dags att bygga något som passar ditt team. Vi designar programvaran kring dina arbetsflöden — inte tvärtom.',
      benefits: ['Byggt kring hur ditt team faktiskt arbetar', 'Växer med din verksamhet', 'Från första samtal till lansering och vidare'],
      useCases: ['Operativa kontrollcenter', 'B2B-portaler', 'Multitenant-SaaS-applikationer'],
      metric: 'Leverera snabbare utan att kompromissa med kvalitet',
    },
    {
      slug: 'web-mobile-development',
      title: 'Webb- och mobilapputveckling',
      summary: 'Oavsett om det är en kundapp eller ett internt dashboard — vi bygger saker som ser bra ut, fungerar smidigt och faktiskt används.',
      description: 'En bra digital produkt handlar inte bara om hur den ser ut — det handlar om hur naturligt människor använder den. Vi bygger webb- och mobilupplevelser som dina kunder och ditt team faktiskt vill öppna.',
      benefits: ['Ser bra ut och fungerar intuitivt', 'Konsekvent på varje enhet', 'Designad kring riktiga användare, inte antaganden'],
      useCases: ['Självserviceappar för kunder', 'Verktyg för fältarbetare', 'Analysdashboards för ledningsgrupper'],
      metric: 'Moderna gränssnitt som driver adoption',
    },
    {
      slug: 'ai-agents-rag-chatbots',
      title: 'AI-agenter och RAG-chatbots',
      summary: 'En assistent som kan din verksamhet utan och innan, hanterar repetitiva förfrågningar och vet när den ska koppla in en riktig person.',
      description: 'Vi bygger AI-assistenter som svarar på frågor baserade på din egen kunskap, hanterar rutinuppgifter automatiskt och lämnar över till ditt team när situationen kräver en mänsklig touch.',
      benefits: ['Svar grundade i din faktiska kunskap', 'Hanterar rutinuppgifter utan manuellt arbete', 'Vet när den ska eskalera till en riktig person'],
      useCases: ['Supportcopiloter för kunder', 'Interna kunskapsassistenter', 'Förslags- och automationsagenter'],
      metric: 'Gör kunskap till support som alltid är på',
    },
    {
      slug: 'cloud-migration-devops',
      title: 'Molnmigrering och DevOps',
      summary: 'Om dina system är långsamma, föråldrade eller svåra att skala — vi moderniserar dem så ditt team kan röra sig snabbare.',
      description: 'Föråldrad infrastruktur ska inte hålla tillbaka ditt team. Vi flyttar dina system till moderna molnplattformar, sätter upp automatiserade pipelines och ser till att din teknik växer med din verksamhet.',
      benefits: ['System som växer med din verksamhet', 'Ditt team levererar snabbare med mindre friktion', 'Mindre brandslockning, mer byggande'],
      useCases: ['Modernisering av legacy-plattformar', 'Platform engineering', 'Förbättrad disaster recovery'],
      metric: 'Minska molnfriktion och öka motståndskraften',
    },
    {
      slug: 'data-engineering-analytics',
      title: 'Dataplattformar och analys',
      summary: 'Du sitter på mer data än du tror. Vi hjälper dig förstå den och omvandla den till riktiga beslut — inte bara kalkylblad.',
      description: 'De flesta verksamheter har data utspridd i system och rapporter som aldrig riktigt hänger ihop. Vi samlar den på ett ställe så att ditt team kan lita på siffrorna och agera på dem med självförtroende.',
      benefits: ['Ett ställe för all din affärsdata', 'Rapporter ditt team faktiskt litar på', 'Beslut baserade på fakta, inte magkänsla'],
      useCases: ['Intäktsanalys', 'KPI-hubbar för ledningen', 'Dataprodukter redo för ML'],
      metric: 'Bygg förtroende i varje affärsbeslut',
    },
    {
      slug: 'enterprise-ai-copilot',
      title: 'Utveckling av enterprise-copiloter',
      summary: 'En smart assistent byggd för ditt teams specifika roll och arbetsflöde, så dina medarbetare kan fokusera på arbetet som kräver mänsklig touch.',
      description: 'Vi bygger AI-copiloter som förstår sammanhanget i ditt teams dagliga arbete — lyfter fram rätt information, föreslår nästa steg och hanterar det repetitiva så att dina medarbetare kan fokusera på det som faktiskt spelar roll.',
      benefits: ['Anpassad för din teams specifika roll', 'Hanterar det repetitiva så folk kan fokusera', 'Fungerar i de verktyg ditt team redan använder'],
      useCases: ['Copiloter för account managers', 'Service desk-assistenter', 'Analytikercopiloter för rapportering och research'],
      metric: 'Multiplicera teamets output med tillförlitlig AI',
    },
  ],
};

const localizedSolutions = {
  sv: [
    {
      slug: 'multi-agent-operations-orchestrator',
      title: 'Operationsorkestrator med flera agenter',
      summary: 'Ett koordinerat nätverk av agenter som övervakar flöden, dirigerar uppgifter och sluter loopen över verksamheten.',
      problem: 'Kritiskt arbete fastnar mellan verktyg, godkännanden och överlämningar, vilket bromsar verksamheten.',
      solution: 'Vi designar multiagentsystem där specialiserade agenter övervakar signaler, resonerar över tillstånd och utför rollspecifika uppgifter över affärssystem.',
      impact: 'Kortare ledtider, färre tappade överlämningar och en betydligt mer responsiv operativ modell.',
      highlights: ['Supervisor-arkitektur för agenter', 'Mänskliga godkännanden i nyckelsteg', 'Full observability över agenternas handlingar'],
    },
    {
      slug: 'multi-agent-customer-service-network',
      title: 'Kundservice-nätverk med flera agenter',
      summary: 'Specialiserade supportagenter som samarbetar över intake, kunskapssökning, triage och lösningsförslag.',
      problem: 'Supportteam hanterar hög volym, splittrad kontext och inkonsekventa svar mellan kanaler.',
      solution: 'Vi skapar agentnätverk som klassificerar ärenden, hämtar kunskap, skriver lösningar och eskalerar edge cases med full kontext.',
      impact: 'Kortare svarstider, jämnare servicekvalitet och mindre belastning på de manuella teamen.',
      highlights: ['Kanalmedveten routing', 'Agenter för kunskap och policys', 'Eskalationsagenter med full konversationskontext'],
    },
    {
      slug: 'sales-enablement-copilot',
      title: 'Copilot för säljaktivering',
      summary: 'En intäktsfokuserad copilot som förbereder kundkontext, skriver uppföljning och driver affären framåt.',
      problem: 'Säljteam förlorar tid på att samla affärskontext, skriva repetitiva uppföljningar och förbereda möten.',
      solution: 'Vi bygger copiloter som hämtar CRM-data, sammanfattar opportunities, skriver utkast och rekommenderar nästa bästa steg.',
      impact: 'Mer säljtid, snabbare kontoförberedelser och starkare pipelinegenomförande.',
      highlights: ['Integrationer med CRM och inkorg', 'Kontosammanfattning och nästa steg', 'Utkast för förslag och uppföljning'],
    },
    {
      slug: 'internal-knowledge-assistant',
      title: 'Intern kunskapsassistent',
      summary: 'Företagsomfattande sök och resonemang för drift, compliance, HR och leveransteam.',
      problem: 'Kritisk information är begravd i mappar, PDF:er och interna system, vilket saktar ner exekveringen och ökar risken.',
      solution: 'Vi centraliserar företagskunskap med sökning, behörigheter och strukturerade prompts så att medarbetare får tillförlitliga svar direkt.',
      impact: 'Minskad söktid, mer konsekventa svar och bättre adoption av interna arbetssätt.',
      highlights: ['Fungerar över dokument, PDF:er och interna system', 'Behörighetsstyrd sökning', 'Användarinsikter och kontinuerlig förbättring'],
    },
    {
      slug: 'document-intelligence-contract-review',
      title: 'Dokumentintelligens och kontraktsgranskning',
      summary: 'AI-stödd granskning av kontrakt, policies, ansökningar och formulär med extraktion, validering och riskmarkering.',
      problem: 'Team granskar långa dokument manuellt, vilket försenar godkännanden och ökar compliancerisk.',
      solution: 'Vi kombinerar OCR, dokumenttolkning, sökning och AI-granskning för att markera klausuler, extrahera data och sammanfatta skyldigheter.',
      impact: 'Kortare granskningstider, högre konsekvens och snabbare genomströmning i dokumentintensiva processer.',
      highlights: ['Klausulextraktion och jämförelse', 'Riskflöden och markeringar', 'Sammanfattningar med källreferenser'],
    },
    {
      slug: 'computer-vision-quality-inspection',
      title: 'Kvalitetsinspektion med datorseende',
      summary: 'Visionsystem som upptäcker fel, verifierar kvalitet och stöder hög precision i operativa flöden.',
      problem: 'Manuell inspektion är långsam, dyr och inkonsekvent i produktion och logistik.',
      solution: 'Vi bygger kamerabaserade inspektionsplattformar som klassificerar fel, validerar standarder och triggar korrigerande arbetsflöden i realtid.',
      impact: 'Högre kvalitetskonsekvens, mindre felutsläpp och mer tillförlitlig inspektion.',
      highlights: ['Modeller för felupptäckt', 'Larm och dashboards i realtid', 'Integration med fabrik- och lagerflöden'],
    },
    {
      slug: 'predictive-maintenance-intelligence',
      title: 'Prediktiv underhållsintelligens',
      summary: 'Sensorbaserad intelligens som förutser fel och hjälper driftteam agera innan stillestånd uppstår.',
      problem: 'Reaktivt underhåll leder till oplanerade avbrott, högre kostnader och lägre tillgänglighet.',
      solution: 'Vi kopplar ihop telemetri, underhållsloggar och anomalidetektion för att lyfta risk och rekommendera preventiva åtgärder.',
      impact: 'Mindre stillestånd, längre livslängd på tillgångar och effektivare underhållsplanering.',
      highlights: ['Anomalidetektion på utrustningssignaler', 'Dashboards för prioritering', 'Larm kopplade till serviceflöden'],
    },
    {
      slug: 'revenue-forecasting-decision-hub',
      title: 'Beslutshub för intäktsprognoser',
      summary: 'En analysmiljö för ledningen som blandar prognoser, scenarioplanering och operativt beslutsstöd.',
      problem: 'Ledningsgrupper fattar beslut baserat på splittrade rapporter och eftersläpande indikatorer.',
      solution: 'Vi skapar beslutshubbar som förenar data, modellerar scenarier, genererar förklaringar och stöder planeringssamtal med självförtroende.',
      impact: 'Bättre prognoskvalitet, starkare synlighet och snabbare beslut hos ledningen.',
      highlights: ['Prognoser och scenariomodellering', 'Dashboards med narrativ sammanfattning', 'Planeringsvyer över funktioner'],
    },
  ],
};

const localizedCaseStudies = {
  sv: [
    {
      slug: 'finops-ai-assistant',
      title: 'AI-copilot för servicedesk hos ett globalt finansoperationsteam',
      sector: 'Finansiella tjänster',
      overview: 'En intern assistent som minskade repetitivt supportarbete och förbättrade lösningstakten för policytunga frågor.',
      problem: 'Agenter sökte manuellt i SOP:er och policydokument för varje ärende, vilket skapade förseningar och ojämna svar.',
      solution: 'Vi implementerade en RAG-assistent med säker dokumentindexering, kontextberikning av ärenden och mänskliga eskaleringsvägar.',
      metrics: [
        { label: 'Genomsnittlig hanteringstid', value: '-42%' },
        { label: 'Första svarshastighet', value: '+58%' },
        { label: 'Träffsäkerhet i policyhänvisningar', value: '97%' },
      ],
    },
    {
      slug: 'cloud-platform-modernization',
      title: 'Modernisering av molnplattform för en detaljhandlare med flera varumärken',
      sector: 'Retail och handel',
      overview: 'En högtillgänglig molnmigrering i kombination med DevOps-automation och observability.',
      problem: 'Legacy-arbetslaster var dyra att underhålla, långsamma att leverera och svåra att skala vid säsongstoppar.',
      solution: 'Vi omarkitekturerade tjänster till molnnativ infrastruktur och införde CI/CD, Infrastructure as Code och realtidsmonitorering.',
      metrics: [
        { label: 'Deployfrekvens', value: '6x' },
        { label: 'Kostnadseffektivitet i molnet', value: '+28%' },
        { label: 'Tillgänglighet', value: '99.95%' },
      ],
    },
    {
      slug: 'executive-analytics-hub',
      title: 'Executive analytics hub för en grupp inom healthcare operations',
      sector: 'Healthcare operations',
      overview: 'En styrd dataplattform som enade rapportering över ekonomi, drift och serviceleverans.',
      problem: 'Ledare arbetade med splittrade kalkylblad och utdaterade rapporter, vilket gjorde planeringen långsam och opålitlig.',
      solution: 'Vi byggde en modern datastack med validerade pipelines, semantiska modeller och dashboards med AI-redo dataprodukter.',
      metrics: [
        { label: 'Rapporteringscykel', value: '-70%' },
        { label: 'Beslutslatens', value: '-55%' },
        { label: 'Data confidence score', value: '+34pts' },
      ],
    },
  ],
};

const localizedTestimonials = {
  sv: [
    {
      quote: 'Vexa skapade struktur, tempo och trovärdighet i vår AI-roadmap. Teamet kändes som en högpresterande förlängning av vårt eget från dag ett.',
      name: 'Melissa Grant',
      role: 'VP Digital Transformation',
      company: 'Northstar Health',
    },
    {
      quote: 'De översatte en komplex molnmodernisering till ett disciplinerat genomförande utan dramatik i ledningsgruppen och med tydliga resultat.',
      name: 'Jordan Lee',
      role: 'CTO',
      company: 'Atlas Retail Group',
    },
    {
      quote: 'Kunskapsassistenten förändrade i grunden hur vårt operationsteam hanterar policytunga supportfrågor.',
      name: 'Priya Raman',
      role: 'Head of Operations',
      company: 'Finova',
    },
  ],
};

const localizedTeamMembers = {
  sv: [
    {
      name: 'Samara Sharin',
      role: 'VD och grundare',
      bio: 'Samara Sharin leder Vexa AIs vision, tillväxt och strategiska riktning och formar bolaget som en premiumpartner för enterprise-AI, mjukvara och digital transformation.',
    },
    {
      name: 'Maliha Mehnaz',
      role: 'CTO och konsult',
      bio: 'Maliha Mehnaz leder Vexa AIs teknikstrategi över enterprise-AI, systemutveckling, molnleverans och konsultarbete med ett praktiskt och exekveringsfokuserat arbetssätt.',
    },
    {
      name: 'Subbir Bin Harun',
      role: 'Account manager och konsult',
      bio: 'Subbir Bin Harun stöder kundkonton, konsultuppdrag och kommersiell koordinering och hjälper Vexa AI att skala med tydlighet och ansvar.',
    },
    {
      name: 'Sofia Patel',
      role: 'Chef för AI-lösningar',
      bio: 'Sofia är specialiserad på RAG, agentorkestrering, utvärderingsramverk och ansvarsfull enterprise-AI.',
    },
    {
      name: 'Daniel Brooks',
      role: 'Director of Cloud & DevOps',
      bio: 'Daniel leder platform engineering, infrastrukturautomation, observability och robusta leveranspipelines.',
    },
    {
      name: 'Nina Alvarez',
      role: 'Principal Product Designer',
      bio: 'Nina skapar polerade digitala upplevelser som balanserar förtroende hos ledningen, användning och konvertering.',
    },
    {
      name: 'Omar Hassan',
      role: 'Lead Data Engineer',
      bio: 'Omar bygger moderna datafundament för analys, AI och operativ rapportering över flera molnekosystem.',
    },
  ],
};

const localizedBlogPosts = {
  sv: [
    {
      slug: 'future-of-gen-ai',
      category: 'Generativ AI',
      title: 'Framtidens affärstillväxt med generativ AI på enterprise-nivå',
      excerpt: 'Hur ledare går från isolerade experiment till säkra, skalbara AI-program som förbättrar service, tempo och beslutsfattande.',
      author: 'Vexa Redaktion',
      role: 'Strategi och research',
      sections: [
        {
          heading: 'Från experiment till arbetssätt',
          paragraphs: [
            'Generativ AI är inte längre ett sidoprojekt för innovationsteam. Företagsledare förväntar sig nu mätbar effekt över kundupplevelse, drift och kunskapsarbete.',
            'Utmaningen är inte om AI ska användas utan hur den operationaliseras ansvarsfullt, säkert och kopplat till verkliga arbetsflöden.'
          ],
        },
        {
          heading: 'Vad framgångsrika team gör annorlunda',
          paragraphs: [
            'De mest framgångsrika organisationerna behandlar AI som en produktkapacitet, inte som en nyhet. De kombinerar modellval med governance, sökning, workflow-integration och mänskliga granskningssteg.',
          ],
          bullets: ['Börja med ett avgränsat användningsfall och tydlig KPI', 'Förankra svar i företagsdata', 'Designa för adoption, inte bara modellprecision'],
        },
        {
          heading: 'Varför genomförandet är avgörande',
          paragraphs: [
            'En premium AI-upplevelse beror lika mycket på arkitektur, förtroende och gränssnittsdesign som på modellen i sig. Där skapar genomförandepartners verklig hävstång.',
          ],
        },
      ],
    },
    {
      slug: 'agentic-solutions-in-business-automation',
      category: 'AI-automation',
      title: 'Agentiska system förändrar affärsautomation från skript till utfall',
      excerpt: 'AI-agenter kan koordinera verktyg, hämta kontext och slutföra arbetsflöden i flera steg med mänsklig kontroll där den behövs.',
      author: 'Vexa Redaktion',
      role: 'AI Delivery',
      sections: [
        {
          heading: 'Automatisering blir målstyrd',
          paragraphs: [
            'Traditionell automatisering bygger på fasta regler. Agentiska system utvidgar detta genom att resonera över kontext, verktyg och mål samtidigt som behörigheter och godkännanden respekteras.',
            'Det gör dem värdefulla för serviceoperationer, researchuppgifter, säljstöd och intern fulfillment.'
          ],
        },
        {
          heading: 'Var team får verkligt värde',
          paragraphs: [
            'Högvärdiga arbetsflöden innehåller ofta repetitiv koordinering snarare än isolerade klick. Agenter är starkast när uppgifter sträcker sig över flera system och kräver sökning plus handling.'
          ],
          bullets: ['Triage av ärenden och lösningsrekommendationer', 'Automatiserad rapportsammanställning', 'Kunskapsdriven svarsutformning'],
        },
        {
          heading: 'Skyddsräcken är fortsatt avgörande',
          paragraphs: [
            'Agentiska system redo för företag designas med spårbarhet, observability, rollbaserad access och överlämning till människor. Tillförlitlighet bygger adoption.'
          ],
        },
      ],
    },
    {
      slug: 'cloud-readiness',
      category: 'Molnstrategi',
      title: 'Molnberedskap 2026: vad moderna migreringsprogram faktiskt kräver',
      excerpt: 'En framgångsrik migreringsstrategi samordnar arkitektur, leveranspipelines, kostnadsinsyn och operativ beredskap innan cutover startar.',
      author: 'Vexa Redaktion',
      role: 'Cloud & Platform',
      sections: [
        {
          heading: 'Migrering är inte bara ett hostingbeslut',
          paragraphs: [
            'De bästa migreringsprogrammen behandlar molnet som en plattformskapacitet. De beaktar runtime, data, nätverk, observability, compliance och release management tillsammans.',
          ],
        },
        {
          heading: 'Tecken på att ett team är redo',
          paragraphs: [
            'Organisationer som lyckas i molnet har vanligtvis en tydlig landing zone, en applikationsinventering och en pragmatisk moderniseringsroadmap snarare än ett lift-and-hope-tänk.',
          ],
          bullets: ['Tydligt prioriterade arbetslaster', 'Automatisering för provisionering och release', 'Kostnads- och prestandaövervakning från start'],
        },
        {
          heading: 'Varför platform engineering spelar roll',
          paragraphs: [
            'Molnmigrering blir hållbar när interna team får repeatable tooling, tydliga runbooks och moderna leveransmönster, inte bara nya infrastrukturfakturor.'
          ],
        },
      ],
    },
  ],
};

export function getLocalizedCompanyContact(language: Language): CompanyContact {
  if (language === 'en') return companyContact;

  return {
    ...companyContact,
    address: 'Radhusesplanaden 6 F, 903 28 Umea, Sverige',
  };
}

export function getLocalizedCompanyStats(language: Language) {
  return language === 'en' ? companyStats : localizedCompanyStats.sv;
}

export function getLocalizedServices(language: Language): ServiceItem[] {
  if (language === 'en') return services;

  return services.map((service) => ({
    ...service,
    ...localizedServices.sv.find((item) => item.slug === service.slug),
  }));
}

export function getLocalizedSolutions(language: Language): SolutionItem[] {
  if (language === 'en') return solutions;

  return solutions.map((solution) => ({
    ...solution,
    ...localizedSolutions.sv.find((item) => item.slug === solution.slug),
  }));
}

export function getLocalizedCaseStudies(language: Language): CaseStudyItem[] {
  if (language === 'en') return caseStudies;

  return caseStudies.map((study) => ({
    ...study,
    ...localizedCaseStudies.sv.find((item) => item.slug === study.slug),
  }));
}

export function getLocalizedTestimonials(language: Language): Testimonial[] {
  return language === 'en' ? testimonials : localizedTestimonials.sv;
}

export function getLocalizedTeamMembers(language: Language): TeamMember[] {
  if (language === 'en') return teamMembers;

  return teamMembers.map((member) => ({
    ...member,
    ...localizedTeamMembers.sv.find((item) => item.name === member.name),
  }));
}

export function getLocalizedBlogPosts(language: Language): BlogPost[] {
  if (language === 'en') return blogPosts;

  return blogPosts.map((post) => ({
    ...post,
    ...localizedBlogPosts.sv.find((item) => item.slug === post.slug),
  }));
}
