import ServiceSection from '@/components/features/service-section';
import { FaCode, FaMobileAlt, FaBrain, FaCloud, FaCogs } from "react-icons/fa";

const servicesData = [
  {
    id: "software-development",
    icon: <FaCode className="w-12 h-12 text-primary" />,
    title: "Custom Software Development",
    description: "We design and build bespoke software solutions from scratch, tailored to your unique business processes. Our solutions are scalable, secure, and built to last.",
    benefits: [
      "Increased efficiency and productivity",
      "Improved data management and security",
      "Scalability to support business growth",
      "Competitive advantage in the market",
    ],
    technologies: ["Java", "Python", ".NET", "Go", "PostgreSQL", "MongoDB"],
    useCases: ["Enterprise Resource Planning (ERP) systems", "Customer Relationship Management (CRM) software", "Supply Chain Management applications"],
  },
  {
    id: "web-development",
    icon: <FaMobileAlt className="w-12 h-12 text-primary" />,
    title: "Web & Mobile App Development",
    description: "We create beautiful, intuitive, and high-performance web and mobile applications that provide a seamless user experience across all devices.",
    benefits: [
      "Enhanced customer engagement",
      "Expanded market reach",
      "Improved brand visibility",
      "Increased sales and revenue",
    ],
    technologies: ["React", "Next.js", "Vue.js", "Node.js", "React Native", "Flutter"],
    useCases: ["E-commerce platforms", "Social media applications", "Booking and reservation systems"],
  },
  {
    id: "ai-agents",
    icon: <FaBrain className="w-12 h-12 text-primary" />,
    title: "AI Agents & RAG Chatbots",
    description: "Leverage the power of Artificial Intelligence to automate tasks, gain insights, and provide intelligent, human-like conversations with our custom AI agents and RAG-based chatbots.",
    benefits: [
      "24/7 customer support",
      "Personalized user experiences",
      "Automated lead generation and qualification",
      "Data-driven decision making",
    ],
    technologies: ["OpenAI API", "LangChain", "Pinecone", "FAISS", "Python", "TensorFlow"],
    useCases: ["Customer service chatbots", "Internal knowledge base assistants", "AI-powered recommendation engines"],
  },
  {
    id: "cloud-migration",
    icon: <FaCloud className="w-12 h-12 text-primary" />,
    title: "Cloud Migration",
    description: "Seamlessly migrate your applications, data, and infrastructure to the cloud with our proven methodologies, ensuring minimal disruption and maximum performance.",
    benefits: [
      "Reduced IT costs",
      "Increased scalability and flexibility",
      "Improved security and compliance",
      "Enhanced disaster recovery capabilities",
    ],
    technologies: ["AWS", "Azure", "Google Cloud Platform (GCP)", "Docker", "Kubernetes"],
    useCases: ["Lift-and-shift migration", "Re-platforming and re-architecting applications", "Cloud-native application development"],
  },
  {
    id: "devops",
    icon: <FaCogs className="w-12 h-12 text-primary" />,
    title: "DevOps & Automation",
    description: "Accelerate your software development lifecycle and improve the quality of your releases with our DevOps and automation services.",
    benefits: [
      "Faster time-to-market",
      "Improved collaboration and communication",
      "Increased reliability and stability",
      "Reduced operational costs",
    ],
    technologies: ["Jenkins", "GitLab CI/CD", "Terraform", "Ansible", "Prometheus", "Grafana"],
    useCases: ["Continuous Integration and Continuous Deployment (CI/CD) pipelines", "Infrastructure as Code (IaC)", "Automated testing and monitoring"],
  },
];

export default function ServicesPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold text-center mb-12">Our Services</h1>
      <div className="space-y-16">
        {servicesData.map((service, index) => (
          <ServiceSection key={index} {...service} />
        ))}
      </div>
    </div>
  );
}