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
      heroBadge: 'AI systems, product engineering, and cloud delivery',
      heroTitle: 'Build AI products that feel',
      heroTitleAccent: 'fast, elegant, and alive.',
      heroDescription:
        'Vexa AI designs intelligent customer experiences, enterprise copilots, and production-grade software that turn complex operations into clear momentum.',
      startProject: 'Start Your Project',
      seeSolutions: 'See Solutions',
      card1Title: 'AI-native delivery',
      card1Body: 'From model orchestration to polished UX.',
      card2Title: 'Assistants that work',
      card2Body: 'Grounded, branded, and production ready.',
      card3Title: 'Premium interfaces',
      card3Body: 'Motion, clarity, and conversion-focused design.',
      cloudFoundations: 'Cloud + data foundations',
      liveCopilots: 'Live copilots and RAG chatbots',
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
      missionTitle: 'Our Mission & Vision',
      missionDescription:
        'Our mission is to empower businesses with transformative technology solutions that drive growth, efficiency, and innovation. We envision a future where every organization can leverage the power of AI and scalable technology to achieve their full potential.',
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
      description: 'Your guide to Vexa AI',
      placeholder: 'Ask a question...',
      initialMessage:
        "Hello! I'm Vexa's AI assistant. I can answer questions about Vexa AI's services, solutions, case studies, team, and contact details.",
      error:
        "Sorry, I'm having trouble connecting. Please try again later.",
      prompts: [
        'What cloud services does Vexa AI offer?',
        "Tell me about Vexa AI's AI chatbot and copilot services.",
        'How can I contact Vexa AI?',
      ],
    },
  },
  sv: {
    nav: {
      home: 'Hem',
      about: 'Om oss',
      services: 'Tjanster',
      solutions: 'Losningar',
      caseStudies: 'Case',
      blog: 'Blogg',
      contact: 'Kontakt',
      contactUs: 'Kontakta oss',
      toggleMenu: 'Oppna meny',
    },
    footer: {
      intro:
        'Vexa AI bygger avancerade AI-produkter, affarskritiska system och molnplattformar som ar skapade for tillvaxt.',
      startProject: 'Starta ett projekt',
      viewSolutions: 'Se losningar',
      navigate: 'Navigera',
      contact: 'Kontakt',
      rights: 'Alla rattigheter forbehallna.',
      privacy: 'Integritet',
      terms: 'Villkor',
    },
    theme: {
      toggle: 'Byt tema',
      light: 'Ljust',
      dark: 'Morkt',
      system: 'System',
    },
    home: {
      heroBadge: 'AI-system, produktutveckling och molnleverans',
      heroTitle: 'Bygg AI-produkter som kanns',
      heroTitleAccent: 'snabba, eleganta och levande.',
      heroDescription:
        'Vexa AI designar intelligenta kundupplevelser, copiloter for foretag och produktionsklara system som forvandlar komplex verksamhet till tydligt momentum.',
      startProject: 'Starta ditt projekt',
      seeSolutions: 'Se losningar',
      card1Title: 'AI-nativ leverans',
      card1Body: 'Fran modellorkestrering till slipad anvandarupplevelse.',
      card2Title: 'Assistenter som fungerar',
      card2Body: 'Forankrade, varumarkesbyggda och redo for produktion.',
      card3Title: 'Premiumgranssnitt',
      card3Body: 'Rorelse, tydlighet och design som konverterar.',
      cloudFoundations: 'Moln- och datafundament',
      liveCopilots: 'Live-copiloter och RAG-chatbots',
      expertiseTitle: 'Var expertis',
      expertiseDescription:
        'Vi erbjuder ett brett spektrum av tjanster som hjalper er att na era affarsmal.',
      solutionsTitle: 'Skraddarsydda losningar for er bransch',
      solutionsDescription:
        'Vi levererar losningar som ar utformade for att mota just er sektors unika utmaningar.',
      learnMore: 'Las mer',
      testimonialsTitle: 'Vad vara kunder sager',
      testimonialsDescription:
        'Vi ar stolta over att ha fortjant vara kunders fortroende. Har ar vad de sager om vart arbete.',
      successTitle: 'Bevisade framgangshistorier',
      successDescription:
        'Se hur vi har hjalpt vara kunder att overvinna utmaningar och na sina mal.',
      viewAllCaseStudies: 'Se alla case',
      readCaseStudy: 'Las case',
      stackTitle: 'Var teknikstack',
      stackDescription:
        'Vi anvander de basta och mest moderna teknikerna for att bygga vara losningar.',
      ctaTitle: 'Redo att starta ert nasta projekt?',
      ctaDescription:
        'Låt oss bygga nagot fantastiskt tillsammans. Kontakta oss for att diskutera era ideer och hur vi kan hjalpa er att na era mal.',
      getInTouch: 'Kontakta oss',
    },
    about: {
      missionTitle: 'Var mission och vision',
      missionDescription:
        'Var mission ar att ge foretag transformativa tekniklosningar som driver tillvaxt, effektivitet och innovation. Vi ser en framtid dar varje organisation kan anvanda kraften i AI och skalbar teknik for att na sin fulla potential.',
      whyChooseUs: 'Varfor valja oss',
      coreValues: 'Vara karvarden',
      leadership: 'Ledning',
      meetTeam: 'Mot vart karnteam',
      teamDescription:
        'Ledningen bakom Vexa AI kombinerar affarsvision, tekniskt genomforande och operativ disciplin.',
    },
    servicesPage: {
      title: 'Vara tjanster',
      keyBenefits: 'Viktiga fordelar',
      useCases: 'Exempel pa anvandningsfall',
      technologies: 'Tekniker vi anvander',
    },
    solutionsPage: {
      title: 'Vara losningar',
      problem: 'Utmaningen',
      solution: 'Var losning',
      impact: 'Effekten',
      aiSolution: 'AI-losning',
      fallbackDescription:
        'Ett fokuserat losningskort utan stodbild, for att halla sektionen ren och redaktionell.',
    },
    caseStudiesPage: {
      title: 'Case',
      sector: 'Bransch',
      problem: 'Utmaning',
      solution: 'Losning',
      keyMetrics: 'Nyckeltal',
      techStack: 'Teknikstack',
    },
    contactPage: {
      title: 'Kontakta oss',
      description:
        'Prata med Vexa AI om produktstrategi, intelligent automatisering, systemleverans och molntransformation.',
      getInTouch: 'Hors av er',
      body:
        'Har ni ett projekt i atanke eller behov av vagledning inom enterprise-AI, systemutveckling eller molntransformation? Hor av er sa aterkommer vi sa snart som mojligt.',
      officeLocation: 'Kontorsadress',
      liveLocation: 'Live-position',
      openInMap: 'Oppna i karta',
    },
    form: {
      title: 'Skicka ett meddelande',
      name: 'Namn',
      company: 'Foretag (valfritt)',
      email: 'E-post',
      message: 'Meddelande',
      namePlaceholder: 'Ditt namn',
      companyPlaceholder: 'Ditt foretag',
      emailPlaceholder: 'Din e-post',
      messagePlaceholder: 'Hur kan vi hjalpa dig?',
      submit: 'Skicka meddelande',
      validationName: 'Namnet maste vara minst 2 tecken.',
      validationEmail: 'Ange en giltig e-postadress.',
      validationMessage: 'Meddelandet maste vara minst 10 tecken.',
    },
    blog: {
      eyebrow: 'Insikter',
      title: 'Tankar om AI, system och modern leverans',
      description:
        'Perspektiv for ledare, tekniska genomgangar och praktisk vagledning for team som bygger med AI, mjukvara och molninfrastruktur.',
      readArticle: 'Las artikel',
      editorial: 'Redaktionellt',
      backToInsights: 'Tillbaka till insikter',
      publishedOn: 'Publicerad',
      byTeam: 'Av Vexa AI-teamet',
      notFound: 'Artikeln hittades inte',
    },
    chatbot: {
      title: 'AI-assistent',
      description: 'Din guide till Vexa AI',
      placeholder: 'Stall en fraga...',
      initialMessage:
        'Hej! Jag ar Vexas AI-assistent. Jag kan svara pa fragor om Vexa AIs tjanster, losningar, case, team och kontaktuppgifter.',
      error:
        'Tyvarr har jag problem att ansluta just nu. Forsok igen senare.',
      prompts: [
        'Vilka molntjanster erbjuder Vexa AI?',
        'Beratta om Vexa AIs AI-chatbotar och copiloter.',
        'Hur kan jag kontakta Vexa AI?',
      ],
    },
  },
} as const;

const localizedCompanyStats = {
  sv: [
    { value: '40%', label: 'snabbare produktleverans med AI-stodda arbetsfloden' },
    { value: '99.95%', label: 'plattformstillganglighet for affarskritiska arbetslaster' },
    { value: '12 veckor', label: 'genomsnittlig pilotstart for copiloter och chatbots' },
    { value: '24/7', label: 'intelligent support och automatisering dygnet runt' },
  ],
};

const localizedServices = {
  sv: [
    {
      slug: 'custom-software-development',
      title: 'Skraddarsydd systemutveckling',
      summary: 'Foretagsplattformar, SaaS-produkter och interna system byggda for tillforlitlighet och tillvaxt.',
      description: 'Vi designar och bygger sakra, skalbara system som passar er verksamhetsmodell, era krav och er kundupplevelse.',
      benefits: ['Arkitektur byggd for skala', 'Sakerhetsfokuserad leverans', 'Produkttank fran discovery till lansering'],
      useCases: ['Operativa kontrollcenter', 'B2B-portaler', 'Multitenant-SaaS-applikationer'],
      metric: 'Leverera snabbare utan att kompromissa med kvalitet',
    },
    {
      slug: 'web-mobile-development',
      title: 'Webb- och mobilapputveckling',
      summary: 'Responsiva digitala produkter som kanns premium, intuitiva och konverteringsfokuserade.',
      description: 'Fran ledningsdashboards till kundappar skapar vi polerade webb- och mobilupplevelser med modern front-end-arkitektur och matbara UX-forbattringar.',
      benefits: ['Enhetlig produktupplevelse over flera enheter', 'Prestandafokuserade granssnitt', 'Snabb iteration med designsystem'],
      useCases: ['Sjlvserviceappar for kunder', 'Verktyg for faltarbetare', 'Analysdashboards for ledningsgrupper'],
      metric: 'Moderna granssnitt som driver adoption',
    },
    {
      slug: 'ai-agents-rag-chatbots',
      title: 'AI-agenter och RAG-chatbots',
      summary: 'Kontextmedvetna assistenter som kombinerar sokning, orkestrering och domanspecifik resonemang.',
      description: 'Vi bygger AI-system som forankrar svar i foretagskunskap, automatiserar repetitivt arbete och eskalerar smidigt nar en manniska ska ta over.',
      benefits: ['Kontextmedvetna svar med kallor', 'Konversationsminne och intentsparning', 'Eskalationsfloden for salj och support'],
      useCases: ['Supportcopiloter for kunder', 'Interna kunskapsassistenter', 'Forslags- och automationsagenter'],
      metric: 'Gor kunskap till support som alltid ar pa',
    },
    {
      slug: 'cloud-migration-devops',
      title: 'Molnmigrering och DevOps',
      summary: 'Molnnativ modernisering over AWS, Azure och GCP med automatisering inbyggd.',
      description: 'Vi migrerar arbetslaster, designar om infrastruktur och implementerar CI/CD och observability sa att ert team kan leverera och skala med sjalvfortroende.',
      benefits: ['Laggre operativ risk', 'Elastisk infrastruktur', 'Hogre leveranshastighet'],
      useCases: ['Modernisering av legacy-plattformar', 'Platform engineering', 'Forbattrad disaster recovery'],
      metric: 'Minska molnfriktion och oka motstandskraften',
    },
    {
      slug: 'data-engineering-analytics',
      title: 'Dataplattformar och analys',
      summary: 'Beslutsfardiga dataplattformar for rapportering, AI och operativ intelligens.',
      description: 'Vi designar robusta pipelines, styrda datamodeller och analysfundament som gor foretagsdata anvandbar over hela verksamheten.',
      benefits: ['En gemensam sanningskalla', 'Tillforlitlig ETL och orkestrering', 'Metriker kopplade till affarsutfall'],
      useCases: ['Intaktsanalys', 'KPI-hubbar for ledningen', 'Dataprodukter redo for ML'],
      metric: 'Bygg fortroende i varje affarsbeslut',
    },
    {
      slug: 'enterprise-ai-copilot',
      title: 'Utveckling av enterprise-copiloter',
      summary: 'Inbyggda AI-copiloter for drift, salj, kunskapsarbete och serviceleverans.',
      description: 'Vi skapar rollanpassade copiloter som integreras med era system, sammanfattar kontext, rekommenderar atgarder och automatiserar arbetsfloden i flera steg.',
      benefits: ['Rollbaserade copiloter', 'Sakra integrationer for foretag', 'Automatisering som forstar arbetsfloden'],
      useCases: ['Copiloter for account managers', 'Service desk-assistenter', 'Analytikercopiloter for rapportering och research'],
      metric: 'Multiplicera teamets output med tillforlitlig AI',
    },
  ],
};

const localizedSolutions = {
  sv: [
    {
      slug: 'multi-agent-operations-orchestrator',
      title: 'Operationsorkestrator med flera agenter',
      summary: 'Ett koordinerat natverk av agenter som overvakar floden, dirigerar uppgifter och sluter loopen over verksamheten.',
      problem: 'Kritiskt arbete fastnar mellan verktyg, godkannanden och overlamningar, vilket bromsar verksamheten.',
      solution: 'Vi designar multiagentsystem dar specialiserade agenter overvakar signaler, resonerar over tillstand och utfor rollspecifika uppgifter over affarssystem.',
      impact: 'Kortare ledtider, farre tappade overlamningar och en betydligt mer responsiv operativ modell.',
      highlights: ['Supervisor-arkitektur for agenter', 'Manliga godkannanden i nyckelsteg', 'Full observability over agenternas handlingar'],
    },
    {
      slug: 'multi-agent-customer-service-network',
      title: 'Kundservice-natverk med flera agenter',
      summary: 'Specialiserade supportagenter som samarbetar over intake, kunskapssokning, triage och losningsforslag.',
      problem: 'Supportteam hanterar hog volym, splittrad kontext och inkonsekventa svar mellan kanaler.',
      solution: 'Vi skapar agentnatverk som klassificerar arenden, hamtar kunskap, skriver losningar och eskalerar edge cases med full kontext.',
      impact: 'Kortare svarstider, jamnare servicekvalitet och mindre belastning pa de manuella teamen.',
      highlights: ['Kanalmedveten routing', 'Agenter for kunskap och policys', 'Eskalationsagenter med full konversationskontext'],
    },
    {
      slug: 'sales-enablement-copilot',
      title: 'Copilot for saljaktivering',
      summary: 'En intaktsfokuserad copilot som forbereder kundkontext, skriver uppfoljning och driver affaren framst.',
      problem: 'Saljteam forlorar tid pa att samla affarskontext, skriva repetitiva uppfoljningar och forbereda moten.',
      solution: 'Vi bygger copiloter som hamtar CRM-data, sammanfattar opportunities, skriver utkast och rekommenderar nasta basta steg.',
      impact: 'Mer saljtid, snabbare kontoforberedelser och starkare pipelinegenomforande.',
      highlights: ['Integrationer med CRM och inkorg', 'Kontosammanfattning och nasta steg', 'Utkast for forslag och uppfoljning'],
    },
    {
      slug: 'internal-knowledge-assistant',
      title: 'Intern kunskapsassistent',
      summary: 'Foretagsomfattande sok och resonemang for drift, compliance, HR och leveransteam.',
      problem: 'Kritisk information ar begravd i mappar, PDF:er och interna system, vilket saktar ner exekveringen och okar risken.',
      solution: 'Vi centraliserar foretagskunskap med sokning, behorigheter och strukturerade prompts sa att medarbetare far tillforlitliga svar direkt.',
      impact: 'Minskad soktid, mer konsekventa svar och battre adoption av interna arbetssatt.',
      highlights: ['Fungerar over dokument, PDF:er och interna system', 'Behorighetsstyrd sokning', 'Anvandarinsikter och kontinuerlig forbattring'],
    },
    {
      slug: 'document-intelligence-contract-review',
      title: 'Dokumentintelligens och kontraktsgranskning',
      summary: 'AI-stodd granskning av kontrakt, policies, ansokningar och formular med extraktion, validering och riskmarkering.',
      problem: 'Team granskar langa dokument manuellt, vilket forsinkar godkannanden och okar compliancerisk.',
      solution: 'Vi kombinerar OCR, dokumenttolkning, sokning och AI-granskning for att markera klausuler, extrahera data och sammanfatta skyldigheter.',
      impact: 'Kortare granskningstider, hogre konsekvens och snabbare genomstromning i dokumentintensiva processer.',
      highlights: ['Klausulextraktion och jamforelse', 'Riskfloden och markeringar', 'Sammanfattningar med kallreferenser'],
    },
    {
      slug: 'computer-vision-quality-inspection',
      title: 'Kvalitetsinspektion med datorseende',
      summary: 'Visionsystem som upptacker fel, verifierar kvalitet och stoder hogprecision i operativa floden.',
      problem: 'Manuell inspektion ar langsam, dyr och inkonsekvent i produktion och logistik.',
      solution: 'Vi bygger kamerabaserade inspektionsplattformar som klassificerar fel, validerar standarder och triggar korrigerande arbetsfloden i realtid.',
      impact: 'Hogre kvalitetskonsekvens, mindre felutslapp och mer tillforlitlig inspektion.',
      highlights: ['Modeller for felupptackt', 'Larm och dashboards i realtid', 'Integration med fabrik- och lagerfloden'],
    },
    {
      slug: 'predictive-maintenance-intelligence',
      title: 'Prediktiv underhallsintelligens',
      summary: 'Sensorbaserad intelligens som forutser fel och hjalper driftteam agera innan stillestand uppstar.',
      problem: 'Reaktivt underhall leder till oplanerade avbrott, hogre kostnader och lagre tillganglighet.',
      solution: 'Vi kopplar ihop telemetri, underhallsloggar och anomalidetektion for att lyfta risk och rekommendera preventiva atgarder.',
      impact: 'Mindre stillestand, langre livslangd pa tillgangar och effektivare underhallsplanering.',
      highlights: ['Anomalidetektion pa utrustningssignaler', 'Dashboards for prioritering', 'Larm kopplade till servicefloden'],
    },
    {
      slug: 'revenue-forecasting-decision-hub',
      title: 'Beslutshub for intaktsprognoser',
      summary: 'En analysmiljo for ledningen som blandar prognoser, scenarioplanering och operativt beslutsstod.',
      problem: 'Ledningsgrupper fattar beslut baserat pa splittrade rapporter och efterslapande indikatorer.',
      solution: 'Vi skapar beslutshubbar som forenar data, modellerar scenarier, genererar forklaringar och stoder planeringssamtal med sjalvfortroende.',
      impact: 'Battre prognoskvalitet, starkare synlighet och snabbare beslut hos ledningen.',
      highlights: ['Prognoser och scenariomodellering', 'Dashboards med narrativ sammanfattning', 'Planeringsvyer over funktioner'],
    },
  ],
};

const localizedCaseStudies = {
  sv: [
    {
      slug: 'finops-ai-assistant',
      title: 'AI-copilot for servicedesk hos ett globalt finansoperationsteam',
      sector: 'Finansiella tjanster',
      overview: 'En intern assistent som minskade repetitivt supportarbete och forbedtrade losningstakten for policytunga fragor.',
      problem: 'Agenter sokte manuellt i SOP:er och policydokument for varje arende, vilket skapade forseningar och ojmna svar.',
      solution: 'Vi implementerade en RAG-assistent med saker dokumentindexering, kontextberikning av arenden och manliga eskaleringsvagar.',
      metrics: [
        { label: 'Genomsnittlig hanteringstid', value: '-42%' },
        { label: 'Forsta svarshastighet', value: '+58%' },
        { label: 'Traffsakerhet i policyhansvisningar', value: '97%' },
      ],
    },
    {
      slug: 'cloud-platform-modernization',
      title: 'Modernisering av molnplattform for en detaljhandlare med flera varumarken',
      sector: 'Retail och handel',
      overview: 'En hogtillganglig molnmigrering i kombination med DevOps-automation och observability.',
      problem: 'Legacy-arbetslaster var dyra att underhalla, langsamma att leverera och svarta att skala vid sasongstoppar.',
      solution: 'Vi omarkitekturerade tjanster till molnnativ infrastruktur och inforde CI/CD, Infrastructure as Code och realtidsmonitorering.',
      metrics: [
        { label: 'Deployfrekvens', value: '6x' },
        { label: 'Kostnadseffektivitet i molnet', value: '+28%' },
        { label: 'Tillganglighet', value: '99.95%' },
      ],
    },
    {
      slug: 'executive-analytics-hub',
      title: 'Executive analytics hub for en grupp inom healthcare operations',
      sector: 'Healthcare operations',
      overview: 'En styrd dataplattform som enade rapportering over ekonomi, drift och serviceleverans.',
      problem: 'Ledare arbetade med splittrade kalkylblad och utdaterade rapporter, vilket gjorde planeringen langsam och opalitlig.',
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
      quote: 'Vexa skapade struktur, tempo och trovardighet i var AI-roadmap. Teamet kandes som en hogpresterande forlangning av vart eget fran dag ett.',
      name: 'Melissa Grant',
      role: 'VP Digital Transformation',
      company: 'Northstar Health',
    },
    {
      quote: 'De oversatte en komplex molnmodernisering till ett disciplinerat genomforande utan dramatik i ledningsgruppen och med tydliga resultat.',
      name: 'Jordan Lee',
      role: 'CTO',
      company: 'Atlas Retail Group',
    },
    {
      quote: 'Kunskapsassistenten forandrade i grunden hur vart operationsteam hanterar policytunga supportfragor.',
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
      bio: 'Samara Sharin leder Vexa AIs vision, tillvaxt och strategiska riktning och formar bolaget som en premiumpartner for enterprise-AI, mjukvara och digital transformation.',
    },
    {
      name: 'Maliha Mehnaz',
      role: 'CTO och konsult',
      bio: 'Maliha Mehnaz leder Vexa AIs teknikstrategi over enterprise-AI, systemutveckling, molnleverans och konsultarbete med ett praktiskt och exekveringsfokuserat arbetssatt.',
    },
    {
      name: 'Subbir Bin Harun',
      role: 'Account manager och konsult',
      bio: 'Subbir Bin Harun stoder kundkonton, konsultuppdrag och kommersiell koordinering och hjalper Vexa AI att skala med tydlighet och ansvar.',
    },
    {
      name: 'Sofia Patel',
      role: 'Chef for AI-losningar',
      bio: 'Sofia ar specialiserad pa RAG, agentorkestrering, utvarderingsramverk och ansvarsfull enterprise-AI.',
    },
    {
      name: 'Daniel Brooks',
      role: 'Director of Cloud & DevOps',
      bio: 'Daniel leder platform engineering, infrastrukturautomation, observability och robusta leveranspipelines.',
    },
    {
      name: 'Nina Alvarez',
      role: 'Principal Product Designer',
      bio: 'Nina skapar polerade digitala upplevelser som balanserar fortroende hos ledningen, anvandning och konvertering.',
    },
    {
      name: 'Omar Hassan',
      role: 'Lead Data Engineer',
      bio: 'Omar bygger moderna datafundament for analys, AI och operativ rapportering over flera molnekosystem.',
    },
  ],
};

const localizedBlogPosts = {
  sv: [
    {
      slug: 'future-of-gen-ai',
      category: 'Generativ AI',
      title: 'Framtidens affarstillvaxt med generativ AI pa enterprise-niva',
      excerpt: 'Hur ledare gar fran isolerade experiment till sakra, skalbara AI-program som forbedtrar service, tempo och beslutsfattande.',
      author: 'Vexa Redaktion',
      role: 'Strategi och research',
      sections: [
        {
          heading: 'Fran experiment till arbetssatt',
          paragraphs: [
            'Generativ AI ar inte langre ett sidoprojekt for innovationsteam. Foretagsledare forvantar sig nu matbar effekt over kundupplevelse, drift och kunskapsarbete.',
            'Utmaningen ar inte om AI ska anvandas utan hur den operationaliseras ansvarfullt, sakert och kopplat till verkliga arbetsfloden.'
          ],
        },
        {
          heading: 'Vad framgangsrika team gor annorlunda',
          paragraphs: [
            'De mest framgangsrika organisationerna behandlar AI som en produktkapacitet, inte som en nyhet. De kombinerar modellval med governance, sokning, workflow-integration och manliga granskningssteg.',
          ],
          bullets: ['Borja med ett avgransat anvandningsfall och tydlig KPI', 'Forankra svar i foretagsdata', 'Designa for adoption, inte bara modellprecision'],
        },
        {
          heading: 'Varfor genomforandet ar avgorande',
          paragraphs: [
            'En premium AI-upplevelse beror lika mycket pa arkitektur, fortroende och grannsittsdesign som pa modellen i sig. Dar skapar genomforandepartners verklig hieb.',
          ],
        },
      ],
    },
    {
      slug: 'agentic-solutions-in-business-automation',
      category: 'AI-automation',
      title: 'Agentiska system forandrar affarsautomation fran skript till utfall',
      excerpt: 'AI-agenter kan koordinera verktyg, hamta kontext och slutfora arbetsfloden i flera steg med manlig kontroll dar den behovs.',
      author: 'Vexa Redaktion',
      role: 'AI Delivery',
      sections: [
        {
          heading: 'Automatisering blir malstyrd',
          paragraphs: [
            'Traditionell automatisering bygger pa fasta regler. Agentiska system utvidgar detta genom att resonera over kontext, verktyg och mal samtidigt som behorigheter och godkannanden respekteras.',
            'Det gor dem vardefulla for serviceoperationer, researchuppgifter, saljstod och intern fulfllment.'
          ],
        },
        {
          heading: 'Var team far verkligt varde',
          paragraphs: [
            'Hogvardiga arbetsfloden innehaller ofta repetitiv koordinering snarare an isolerade klick. Agenter ar starkast nar uppgifter stracker sig over flera system och kraver sokning plus handling.'
          ],
          bullets: ['Triage av arenden och losningsrekommendationer', 'Automatiserad rapportsammanstallning', 'Kunskapsdriven svarsutformning'],
        },
        {
          heading: 'Skyddsracken ar fortsatt avgorande',
          paragraphs: [
            'Agentiska system redo for foretag designas med spårbarhet, observability, rollbaserad access och overlamning till manniskor. Tillforlitlighet bygger adoption.'
          ],
        },
      ],
    },
    {
      slug: 'cloud-readiness',
      category: 'Molnstrategi',
      title: 'Molnberedskap 2026: vad moderna migreringsprogram faktiskt kraver',
      excerpt: 'En framgangsrik migreringsstrategi samordnar arkitektur, leveranspipelines, kostnadsinsyn och operativ beredskap innan cutover startar.',
      author: 'Vexa Redaktion',
      role: 'Cloud & Platform',
      sections: [
        {
          heading: 'Migrering ar inte bara ett hostingbeslut',
          paragraphs: [
            'De basta migreringsprogrammen behandlar molnet som en plattformskapacitet. De beaktar runtime, data, natverk, observability, compliance och release management tillsammans.',
          ],
        },
        {
          heading: 'Tecken pa att ett team ar redo',
          paragraphs: [
            'Organisationer som lyckas i molnet har vanligtvis en tydlig landing zone, en applikationsinventering och en pragmatisk moderniseringsroadmap snarare an ett lift-and-hope-tank.',
          ],
          bullets: ['Tydligt prioriterade arbetslaster', 'Automatisering for provisionering och release', 'Kostnads- och prestandaovervakning fran start'],
        },
        {
          heading: 'Varfor platform engineering spelar roll',
          paragraphs: [
            'Molnmigrering blir hallbar nar interna team far repeatable tooling, tydliga runbooks och moderna leveransmonster, inte bara nya infrastrukturfakturor.'
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
