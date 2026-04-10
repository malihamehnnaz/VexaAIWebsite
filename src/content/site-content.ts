export type ServiceItem = {
  slug: string;
  title: string;
  summary: string;
  description: string;
  benefits: string[];
  technologies: string[];
  useCases: string[];
  metric: string;
  icon: 'code' | 'monitor' | 'bot' | 'cloud' | 'workflow' | 'database';
};

export type SolutionItem = {
  slug: string;
  title: string;
  summary: string;
  problem: string;
  solution: string;
  impact: string;
  highlights: string[];
  icon: 'sparkles' | 'message' | 'search' | 'zap';
};

export type CaseStudyItem = {
  slug: string;
  title: string;
  sector: string;
  overview: string;
  problem: string;
  solution: string;
  techStack: string[];
  metrics: { label: string; value: string }[];
};

export type TeamMember = {
  name: string;
  role: string;
  bio: string;
  linkedin: string;
  initials: string;
};

export type CompanyContact = {
  email: string;
  phone: string;
  phoneHref: string;
  address: string;
};

export type Testimonial = {
  quote: string;
  name: string;
  role: string;
  company: string;
};

export type BlogSection = {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
};

export type BlogPost = {
  slug: string;
  category: string;
  title: string;
  excerpt: string;
  author: string;
  role: string;
  date: string;
  readTime: string;
  sections: BlogSection[];
};

export const companyStats = [
  { value: '40%', label: 'faster product delivery with AI-enabled workflows' },
  { value: '99.95%', label: 'platform reliability for enterprise workloads' },
  { value: '12 weeks', label: 'average pilot launch for copilots and chatbots' },
  { value: '24/7', label: 'intelligent support and automation coverage' },
];

export const clientLogos = ['Finova', 'HelixOps', 'Northstar Health', 'Atlas Retail', 'Quantum Legal', 'Pulse Energy'];

export const services: ServiceItem[] = [
  {
    slug: 'custom-software-development',
    title: 'Custom Software Development',
    summary: 'Enterprise platforms, SaaS products, and internal systems engineered for reliability and growth.',
    description: 'We design and build secure, scalable software that aligns with your operating model, compliance requirements, and customer experience goals.',
    benefits: ['Architecture built for scale', 'Security-first delivery', 'Product thinking from discovery to rollout'],
    technologies: ['Next.js', '.NET', 'Node.js', 'Python', 'PostgreSQL', 'GraphQL'],
    useCases: ['Operational command centers', 'B2B portals', 'Multi-tenant SaaS applications'],
    metric: 'Ship faster without compromising quality',
    icon: 'code',
  },
  {
    slug: 'web-mobile-development',
    title: 'Web & Mobile App Development',
    summary: 'Responsive digital products that feel premium, intuitive, and conversion-focused.',
    description: 'From executive dashboards to customer-facing apps, we craft polished web and mobile experiences with modern front-end architecture and measurable UX improvements.',
    benefits: ['Unified product experience across devices', 'Performance-first interfaces', 'Rapid iteration with design systems'],
    technologies: ['React', 'Next.js', 'React Native', 'Flutter', 'Tailwind CSS', 'Figma'],
    useCases: ['Customer self-service apps', 'Field workforce tools', 'Executive analytics dashboards'],
    metric: 'Modern interfaces that drive adoption',
    icon: 'monitor',
  },
  {
    slug: 'ai-agents-rag-chatbots',
    title: 'AI Agents & RAG Chatbots',
    summary: 'Context-aware assistants that combine retrieval, orchestration, and domain-specific reasoning.',
    description: 'We build AI systems that ground responses in company knowledge, automate repetitive work, and escalate seamlessly when a human should step in.',
    benefits: ['Context-aware answers with citations', 'Conversation memory and intent tracking', 'Escalation workflows for sales and support'],
    technologies: ['OpenAI', 'LangChain', 'Pinecone', 'FAISS', 'Genkit', 'Python'],
    useCases: ['Customer support copilots', 'Internal knowledge assistants', 'Proposal drafting and automation agents'],
    metric: 'Turn knowledge into always-on support',
    icon: 'bot',
  },
  {
    slug: 'cloud-migration-devops',
    title: 'Cloud Migration & DevOps',
    summary: 'Cloud-native modernization across AWS, Azure, and GCP with automation built in.',
    description: 'We migrate workloads, redesign infrastructure, and implement CI/CD and observability so your team can ship and scale with confidence.',
    benefits: ['Lower operational risk', 'Elastic infrastructure', 'Improved deployment velocity'],
    technologies: ['AWS', 'Azure', 'Google Cloud', 'Docker', 'Kubernetes', 'Terraform'],
    useCases: ['Legacy platform modernization', 'Platform engineering', 'Disaster recovery improvements'],
    metric: 'Reduce cloud friction and improve resilience',
    icon: 'cloud',
  },
  {
    slug: 'data-engineering-analytics',
    title: 'Data Engineering & Analytics',
    summary: 'Decision-ready data platforms for reporting, AI, and operational intelligence.',
    description: 'We design robust pipelines, governed data models, and analytics foundations that make enterprise data useful across business functions.',
    benefits: ['Single source of truth', 'Reliable ETL and orchestration', 'Metrics aligned to business outcomes'],
    technologies: ['dbt', 'Airflow', 'BigQuery', 'Snowflake', 'Power BI', 'Looker'],
    useCases: ['Revenue analytics', 'Executive KPI hubs', 'ML-ready data products'],
    metric: 'Build trust in every business decision',
    icon: 'database',
  },
  {
    slug: 'enterprise-ai-copilot',
    title: 'Enterprise AI Copilot Development',
    summary: 'Embedded AI copilots for operations, sales, knowledge work, and service delivery.',
    description: 'We create role-specific copilots that integrate with your systems, summarize context, recommend actions, and automate multi-step workflows.',
    benefits: ['Role-based copilots', 'Secure enterprise integrations', 'Workflow-aware automation'],
    technologies: ['Microsoft Graph', 'OpenAI', 'Vertex AI', 'OAuth', 'Vector stores', 'TypeScript'],
    useCases: ['Account manager copilots', 'Service desk assistants', 'Analyst copilots for reporting and research'],
    metric: 'Multiply team output with trustworthy AI',
    icon: 'workflow',
  },
];

export const solutions: SolutionItem[] = [
  {
    slug: 'multi-agent-operations-orchestrator',
    title: 'Multi-Agent Operations Orchestrator',
    summary: 'A coordinated network of agents that monitors workflows, routes tasks, and closes the loop across operations.',
    problem: 'Critical work gets stuck across disconnected tools, approvals, and handoffs, slowing the business down.',
    solution: 'We design multi-agent systems where specialist agents monitor signals, reason over state, and execute role-specific tasks across business platforms.',
    impact: 'Faster cycle times, fewer dropped handoffs, and a far more responsive operating model.',
    highlights: ['Supervisor-agent architecture', 'Human approvals at key checkpoints', 'Full observability across agent actions'],
    icon: 'sparkles',
  },
  {
    slug: 'multi-agent-customer-service-network',
    title: 'Multi-Agent Customer Service Network',
    summary: 'Multiple specialized support agents working together across intake, knowledge retrieval, triage, and resolution drafting.',
    problem: 'Support teams face high ticket volume, fragmented context, and inconsistent answers across channels.',
    solution: 'We create agent networks that classify requests, retrieve knowledge, draft resolutions, and escalate edge cases with full context.',
    impact: 'Lower response times, more consistent service quality, and reduced support burden for human teams.',
    highlights: ['Channel-aware routing agents', 'Knowledge and policy retrieval agents', 'Escalation agents with full conversation context'],
    icon: 'message',
  },
  {
    slug: 'sales-enablement-copilot',
    title: 'Sales Enablement Copilot',
    summary: 'A revenue-focused copilot that prepares account context, drafts follow-ups, and supports faster deal progression.',
    problem: 'Sales teams lose time collecting deal context, writing repetitive follow-ups, and preparing for meetings.',
    solution: 'We build copilots that pull CRM data, summarize opportunities, draft outreach, and recommend next-best actions.',
    impact: 'More selling time, faster account preparation, and stronger pipeline execution.',
    highlights: ['CRM and inbox integrations', 'Account summarization and next-step guidance', 'Proposal and follow-up drafting'],
    icon: 'search',
  },
  {
    slug: 'internal-knowledge-assistant',
    title: 'Internal Knowledge Assistant',
    summary: 'Company-wide search and reasoning for operations, compliance, HR, and delivery teams.',
    problem: 'Critical information is buried in drive folders, PDFs, and internal systems, slowing execution and increasing risk.',
    solution: 'We centralize enterprise knowledge with retrieval, permissions, and structured prompts so employees get trusted answers instantly.',
    impact: 'Reduced search time, more consistent answers, and better adoption of internal best practices.',
    highlights: ['Works across docs, PDFs, and internal systems', 'Permission-aware retrieval', 'Usage analytics and continuous improvement loops'],
    icon: 'zap',
  },
  {
    slug: 'document-intelligence-contract-review',
    title: 'Document Intelligence & Contract Review',
    summary: 'AI-assisted review of contracts, policies, applications, and forms with extraction, validation, and risk highlighting.',
    problem: 'Teams manually review long documents, slowing approvals and increasing compliance risk.',
    solution: 'We combine OCR, document parsing, retrieval, and AI review workflows to flag clauses, extract data, and summarize obligations.',
    impact: 'Shorter review cycles, better consistency, and faster throughput in legal and operations workflows.',
    highlights: ['Clause extraction and comparison', 'Risk flagging workflows', 'Review summaries with source references'],
    icon: 'message',
  },
  {
    slug: 'computer-vision-quality-inspection',
    title: 'Computer Vision Quality Inspection',
    summary: 'Vision systems that detect defects, verify process quality, and support high-precision operational workflows.',
    problem: 'Manual inspection is slow, expensive, and inconsistent at scale in production and logistics environments.',
    solution: 'We build camera-based inspection platforms that classify defects, validate compliance, and trigger corrective workflows in real time.',
    impact: 'Higher quality consistency, lower defect leakage, and more reliable inspection operations.',
    highlights: ['Defect detection models', 'Real-time alerting and dashboards', 'Integration with plant and warehouse workflows'],
    icon: 'search',
  },
  {
    slug: 'predictive-maintenance-intelligence',
    title: 'Predictive Maintenance Intelligence',
    summary: 'Sensor-driven intelligence that predicts failures and helps operations teams intervene before downtime occurs.',
    problem: 'Reactive maintenance leads to unplanned outages, higher service costs, and lower asset availability.',
    solution: 'We connect telemetry, maintenance logs, and anomaly detection models to surface risk and recommend preventive action.',
    impact: 'Lower downtime, longer asset life, and more efficient maintenance planning.',
    highlights: ['Anomaly detection on equipment signals', 'Maintenance prioritization dashboards', 'Alerts tied to service workflows'],
    icon: 'sparkles',
  },
  {
    slug: 'revenue-forecasting-decision-hub',
    title: 'Revenue Forecasting & Decision Hub',
    summary: 'An executive analytics environment that blends forecasting, scenario planning, and operational decision support.',
    problem: 'Leadership teams rely on fragmented reports and lagging indicators when making revenue and growth decisions.',
    solution: 'We create decision hubs that unify data, model scenarios, generate explanations, and support planning conversations with confidence.',
    impact: 'Better forecasting quality, stronger visibility, and faster executive decision-making.',
    highlights: ['Forecasting and scenario modeling', 'Executive dashboards with narrative summaries', 'Cross-functional planning views'],
    icon: 'zap',
  },
];

export const caseStudies: CaseStudyItem[] = [
  {
    slug: 'finops-ai-assistant',
    title: 'AI service desk copilot for a global finance operations team',
    sector: 'Financial services',
    overview: 'An internal assistant that reduced repetitive support work and improved speed of resolution for policy-heavy requests.',
    problem: 'Agents were manually searching SOPs and policy PDFs for every request, creating delays and inconsistent responses.',
    solution: 'We deployed a RAG assistant with secure document indexing, ticket context enrichment, and human escalation pathways.',
    techStack: ['Next.js', 'Python', 'Pinecone', 'OpenAI', 'Azure', 'PostgreSQL'],
    metrics: [
      { label: 'Average handling time', value: '-42%' },
      { label: 'First-response speed', value: '+58%' },
      { label: 'Policy citation accuracy', value: '97%' },
    ],
  },
  {
    slug: 'cloud-platform-modernization',
    title: 'Cloud platform modernization for a multi-brand retailer',
    sector: 'Retail & commerce',
    overview: 'A high-availability cloud migration paired with DevOps automation and observability.',
    problem: 'Legacy workloads were expensive to maintain, slow to deploy, and difficult to scale during seasonal demand spikes.',
    solution: 'We re-architected services to cloud-native infrastructure, introduced CI/CD, infrastructure as code, and real-time monitoring.',
    techStack: ['AWS', 'Terraform', 'Kubernetes', 'GitHub Actions', 'Datadog', 'Node.js'],
    metrics: [
      { label: 'Deployment frequency', value: '6x' },
      { label: 'Cloud cost efficiency', value: '+28%' },
      { label: 'Uptime', value: '99.95%' },
    ],
  },
  {
    slug: 'executive-analytics-hub',
    title: 'Executive analytics hub for a healthcare operations group',
    sector: 'Healthcare operations',
    overview: 'A governed data platform that unified reporting across finance, operations, and service delivery.',
    problem: 'Leaders were working from disconnected spreadsheets and outdated reports, making planning slow and unreliable.',
    solution: 'We built a modern data stack with validated pipelines, semantic models, and executive dashboards with AI-ready data products.',
    techStack: ['BigQuery', 'dbt', 'Airflow', 'Looker', 'Python', 'GCP'],
    metrics: [
      { label: 'Reporting cycle', value: '-70%' },
      { label: 'Decision latency', value: '-55%' },
      { label: 'Data confidence score', value: '+34pts' },
    ],
  },
];

export const testimonials: Testimonial[] = [
  {
    quote: 'Vexa brought structure, speed, and credibility to our AI roadmap. Their team felt like a high-performing extension of ours from day one.',
    name: 'Melissa Grant',
    role: 'VP Digital Transformation',
    company: 'Northstar Health',
  },
  {
    quote: 'They translated a complex cloud modernization effort into a disciplined rollout with zero executive drama and very visible results.',
    name: 'Jordan Lee',
    role: 'CTO',
    company: 'Atlas Retail Group',
  },
  {
    quote: 'The knowledge assistant fundamentally changed how our operations team handles policy-heavy support questions.',
    name: 'Priya Raman',
    role: 'Head of Operations',
    company: 'Finova',
  },
];

export const companyTimeline = [
  { year: '2021', title: 'Founded around enterprise modernization', detail: 'Vexa launched with a focus on custom platforms and cloud transformation.' },
  { year: '2022', title: 'Expanded into AI delivery', detail: 'We introduced applied AI services for automation, copilots, and data workflows.' },
  { year: '2024', title: 'Enterprise RAG programs', detail: 'Clients adopted our retrieval-based assistants for support, internal search, and enablement.' },
  { year: '2026', title: 'AI-native transformation partner', detail: 'Today we blend engineering, cloud, and AI into measurable enterprise outcomes.' },
];

export const companyValues = [
  { title: 'Enterprise clarity', description: 'We simplify complex transformation programs into clear milestones, risks, and ROI.' },
  { title: 'Engineering depth', description: 'Architecture, reliability, and security are built into every engagement from day one.' },
  { title: 'AI with accountability', description: 'Every intelligent experience is designed with guardrails, traceability, and human escalation.' },
  { title: 'Outcome obsession', description: 'We measure our work by adoption, speed, resilience, and business impact—not just delivery.' },
];

export const companyContact: CompanyContact = {
  email: 'admin@vexaai.se',
  phone: '0735777459',
  phoneHref: 'tel:0735777459',
  address: 'Rådhusesplanaden 6 F, 903 28 Umeå, Sweden',
};

export const teamMembers: TeamMember[] = [
  {
    name: 'Samara Sharin',
    role: 'Chief Executive Officer & Founder',
    bio: 'Samara Sharin leads Vexa AI’s vision, growth, and strategic direction, shaping the company as a premium partner for enterprise AI, software, and digital transformation.',
    linkedin: 'https://www.linkedin.com/',
    initials: 'SS',
  },
  {
    name: 'Maliha Mehnaz',
    role: 'Chief Technology Officer',
    bio: 'Maliha Mehnaz leads Vexa AI’s technology strategy across enterprise AI, software engineering, and cloud delivery with a practical, execution-focused approach.',
    linkedin: 'https://www.linkedin.com/',
    initials: 'MM',
  },
  {
    name: 'Subbir Bin Harun',
    role: 'Finance Manager',
    bio: 'Subbir Bin Harun oversees financial planning, operational controls, and commercial discipline, helping Vexa AI scale with clarity and accountability.',
    linkedin: 'https://www.linkedin.com/',
    initials: 'SB',
  },
  {
    name: 'Sofia Patel',
    role: 'Head of AI Solutions',
    bio: 'Sofia specializes in RAG, agent orchestration, evaluation frameworks, and responsible enterprise AI implementation.',
    linkedin: 'https://www.linkedin.com/',
    initials: 'SP',
  },
  {
    name: 'Daniel Brooks',
    role: 'Director of Cloud & DevOps',
    bio: 'Daniel leads platform engineering, infrastructure automation, observability, and resilient delivery pipelines.',
    linkedin: 'https://www.linkedin.com/',
    initials: 'DB',
  },
  {
    name: 'Nina Alvarez',
    role: 'Principal Product Designer',
    bio: 'Nina crafts polished digital experiences that balance executive trust, user adoption, and conversion performance.',
    linkedin: 'https://www.linkedin.com/',
    initials: 'NA',
  },
  {
    name: 'Omar Hassan',
    role: 'Lead Data Engineer',
    bio: 'Omar builds modern data foundations for analytics, AI, and operational reporting across cloud ecosystems.',
    linkedin: 'https://www.linkedin.com/',
    initials: 'OH',
  },
];

export const blogPosts: BlogPost[] = [
  {
    slug: 'future-of-gen-ai',
    category: 'Generative AI',
    title: 'The future of business growth with enterprise-grade generative AI',
    excerpt: 'How leaders are moving from isolated experiments to secure, scalable AI programs that improve service, speed, and decision quality.',
    author: 'Vexa Editorial',
    role: 'Strategy & Research',
    date: '2026-03-15',
    readTime: '6 min read',
    sections: [
      {
        heading: 'From experimentation to operating model',
        paragraphs: [
          'Generative AI is no longer a side project for innovation teams. Enterprise leaders now expect measurable impact across customer experience, operations, and knowledge work.',
          'The challenge is not whether to use AI—it is how to operationalize it responsibly, securely, and in a way that connects to real business workflows.'
        ],
      },
      {
        heading: 'What leading teams are doing differently',
        paragraphs: [
          'The most successful organizations treat AI as a product capability, not a novelty. They pair model choice with governance, retrieval, workflow integration, and human review paths.',
        ],
        bullets: ['Start with a bounded use case and clear KPI', 'Ground outputs in enterprise data', 'Design for adoption, not just model accuracy'],
      },
      {
        heading: 'Why execution matters',
        paragraphs: [
          'A premium AI experience depends on architecture, trust, and interface design just as much as it depends on the model itself. That is where implementation partners create leverage.',
        ],
      },
    ],
  },
  {
    slug: 'agentic-solutions-in-business-automation',
    category: 'AI Automation',
    title: 'Agentic systems are changing business automation from scripts to outcomes',
    excerpt: 'AI agents can coordinate tools, retrieve context, and complete multi-step work with human oversight where it matters.',
    author: 'Vexa Editorial',
    role: 'AI Delivery',
    date: '2026-02-27',
    readTime: '7 min read',
    sections: [
      {
        heading: 'Automation is becoming goal-driven',
        paragraphs: [
          'Traditional automation relies on fixed rules. Agentic systems extend that by reasoning across context, tools, and objectives while still respecting permissions and approval boundaries.',
          'This makes them valuable for service operations, research tasks, sales enablement, and internal request fulfillment.'
        ],
      },
      {
        heading: 'Where teams get real value',
        paragraphs: [
          'High-value workflows tend to involve repetitive coordination rather than isolated clicks. Agents shine when tasks span multiple systems and require retrieval plus action.'
        ],
        bullets: ['Ticket triage and resolution recommendations', 'Automated report assembly', 'Knowledge-driven response drafting'],
      },
      {
        heading: 'Guardrails remain essential',
        paragraphs: [
          'Enterprise-ready agentic systems are designed with auditability, observability, role-based access, and fallbacks to humans. Reliability builds adoption.'
        ],
      },
    ],
  },
  {
    slug: 'cloud-readiness',
    category: 'Cloud Strategy',
    title: 'Cloud readiness in 2026: what modern migration programs actually require',
    excerpt: 'A successful migration strategy aligns architecture, delivery pipelines, cost visibility, and operational readiness before cutover begins.',
    author: 'Vexa Editorial',
    role: 'Cloud & Platform',
    date: '2026-01-30',
    readTime: '5 min read',
    sections: [
      {
        heading: 'Migration is not just a hosting decision',
        paragraphs: [
          'The best migration programs treat cloud as a platform capability. They consider runtime, data, networking, observability, compliance, and release management together.',
        ],
      },
      {
        heading: 'Signs a team is ready',
        paragraphs: [
          'Organizations that succeed in the cloud usually have a clear landing zone, an application inventory, and a practical modernization roadmap rather than a lift-and-hope mindset.'
        ],
        bullets: ['Defined workload priorities', 'Automation for provisioning and release', 'Cost and performance monitoring from the start'],
      },
      {
        heading: 'Why platform engineering matters',
        paragraphs: [
          'Cloud migrations become sustainable when internal teams inherit repeatable tooling, clear runbooks, and modern delivery patterns—not just new infrastructure bills.'
        ],
      },
    ],
  },
];

export function getBlogPost(slug: string) {
  return blogPosts.find((post) => post.slug === slug);
}