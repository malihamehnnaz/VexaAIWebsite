import CaseStudyCard from '@/components/features/case-study-card';

const caseStudiesData = [
  {
    id: "case-1",
    title: "AI-Powered Automation for a Fortune 500 Company",
    problem: "A leading financial services company was struggling with manual data entry and reconciliation processes, leading to high costs, errors, and slow turnaround times.",
    solution: "We developed a custom AI-powered automation solution that uses machine learning and natural language processing to extract data from various sources, validate it, and automatically reconcile it with their internal systems. The solution also includes a dashboard for monitoring and exception handling.",
    techStack: ["Python", "TensorFlow", "AWS Textract", "React", "Node.js", "PostgreSQL"],
    results: "The solution reduced manual data entry by 95%, saved over 20,000 work hours annually, and improved data accuracy to 99.9%.",
    image: "/images/case-studies/case-1-full.png",
  },
  {
    id: "case-2",
    title: "Scalable E-commerce Platform for a Fast-Growing Retailer",
    problem: "A rapidly growing online retailer's existing e-commerce platform could not handle the increasing traffic and sales volume, resulting in frequent crashes and lost revenue.",
    solution: "We re-architected and rebuilt their e-commerce platform from the ground up using a modern, scalable, and cloud-native architecture. The new platform features a microservices-based backend, a headless CMS, and a progressive web app (PWA) for the frontend.",
    techStack: ["Next.js", "Node.js", "GraphQL", "Kubernetes", "AWS", "Stripe"],
    results: "The new platform can handle 10x the previous traffic, has a 99.99% uptime, and has led to a 30% increase in conversion rates.",
    image: "/images/case-studies/case-2-full.png",
  },
  {
    id: "case-3",
    title: "RAG-Based Knowledge Base for a Financial Institution",
    problem: "A large financial institution's employees had difficulty finding accurate and up-to-date information from their vast internal knowledge base, leading to inconsistent customer service and compliance risks.",
    solution: "We implemented a Retrieval-Augmented Generation (RAG) based knowledge assistant that allows employees to ask questions in natural language and receive instant, accurate answers from the company's internal documents and policies. The assistant also provides links to the source documents for verification.",
    techStack: ["LangChain", "OpenAI API", "Pinecone", "Python", "React"],
    results: "The knowledge assistant reduced the time employees spend searching for information by 80%, improved first-call resolution rates by 25%, and ensured consistent and compliant answers to customer inquiries.",
    image: "/images/case-studies/case-3-full.png",
  },
];

export default function CaseStudiesPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold text-center mb-12">Case Studies</h1>
      <div className="space-y-16">
        {caseStudiesData.map((study, index) => (
          <CaseStudyCard key={index} {...study} />
        ))}
      </div>
    </div>
  );
}