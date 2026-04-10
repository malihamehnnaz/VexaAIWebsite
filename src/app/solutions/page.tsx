import SolutionSection from '@/components/features/solution-section';

const solutionsData = [
  {
    id: "ai-copilot",
    title: "Enterprise AI Copilot",
    problem: "Employees spend countless hours searching for information, performing repetitive tasks, and struggling with complex software. This leads to decreased productivity and increased operational costs.",
    solution: "We develop a custom AI Copilot for your enterprise. This intelligent assistant integrates with your existing systems, providing instant access to information, automating workflows, and offering proactive guidance to your employees.",
    impact: "Our AI Copilot can increase employee productivity by up to 40%, reduce onboarding time for new hires, and provide a significant return on investment within the first year.",
    image: "/images/solutions/ai-copilot-solution.png",
  },
  {
    id: "rag-chatbot",
    title: "Customer Support AI Chatbot (RAG)",
    problem: "Customer support teams are often overwhelmed with repetitive inquiries, leading to long wait times and frustrated customers. Traditional chatbots lack the ability to answer complex questions accurately.",
    solution: "We build advanced customer support chatbots powered by Retrieval-Augmented Generation (RAG). These chatbots can understand natural language, access your knowledge base, and provide accurate, context-aware answers to customer questions 24/7.",
    impact: "Reduce customer support tickets by up to 70%, improve customer satisfaction scores, and free up your support agents to focus on high-value interactions.",
    image: "/images/solutions/rag-chatbot-solution.png",
  },
  {
    id: "knowledge-assistant",
    title: "Internal Knowledge Assistant",
    problem: "Valuable company knowledge is often siloed in different documents, emails, and systems, making it difficult for employees to find the information they need to do their jobs effectively.",
    solution: "We create a centralized, AI-powered knowledge assistant that connects to all your data sources. Employees can simply ask questions in natural language and get instant, accurate answers with source citations.",
    impact: "Dramatically reduce time spent searching for information, improve decision-making, and foster a culture of knowledge sharing within your organization.",
    image: "/images/solutions/knowledge-assistant-solution.png",
  },
  {
    id: "workflow-automation",
    title: "Workflow Automation Systems",
    problem: "Manual, repetitive workflows are time-consuming, prone to errors, and hinder your organization's ability to scale. This can lead to bottlenecks and inefficiencies.",
    solution: "We design and implement intelligent workflow automation systems that streamline your business processes. From data entry and report generation to complex multi-step approvals, we can automate it all.",
    impact: "Increase operational efficiency, reduce human error, and accelerate your business processes, allowing your team to focus on strategic initiatives.",
    image: "/images/solutions/workflow-automation-solution.png",
  },
];

export default function SolutionsPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold text-center mb-12">Our Solutions</h1>
      <div className="space-y-16">
        {solutionsData.map((solution, index) => (
          <SolutionSection key={index} {...solution} imagePosition={index % 2 === 0 ? 'left' : 'right'} />
        ))}
      </div>
    </div>
  );
}