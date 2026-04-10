import SolutionSection from '@/components/features/solution-section';

const solutionsData = [
  {
    id: "multi-agent-operations-orchestrator",
    title: "Multi-Agent Operations Orchestrator",
    problem: "Complex enterprise workflows stall when work is spread across inboxes, dashboards, tickets, and approvals with no central coordination.",
    solution: "We build multi-agent systems where specialized agents monitor workflows, gather context, route decisions, and execute tasks across systems while humans approve only the moments that matter.",
    impact: "Reduce operational delays, increase throughput, and create a more resilient execution model across departments.",
    image: "https://images.unsplash.com/photo-1697577418970-95d99b5a55cf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1400",
  },
  {
    id: "multi-agent-customer-service-network",
    title: "Multi-Agent Customer Service Network",
    problem: "Support teams deal with high ticket volumes, repeated context gathering, and inconsistent answers across channels.",
    solution: "We deploy coordinated support agents that classify requests, retrieve knowledge, draft responses, trigger workflows, and escalate to human agents with the full case context attached.",
    impact: "Improve response speed, reduce support load, and deliver more consistent customer experiences.",
    image: "https://images.unsplash.com/photo-1531297484001-80022131f5a1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1400",
  },
  {
    id: "sales-enablement-copilot",
    title: "Sales Enablement Copilot",
    problem: "Revenue teams waste time preparing for calls, summarizing opportunities, and drafting repetitive follow-ups.",
    solution: "We create copilots that connect to CRM, inbox, notes, and proposal assets to prepare account context, generate next steps, and accelerate seller productivity.",
    impact: "Increase selling time, improve opportunity preparation, and create stronger momentum across the pipeline.",
  },
  {
    id: "internal-knowledge-assistant",
    title: "Internal Knowledge Assistant",
    problem: "Critical business knowledge is spread across PDFs, wikis, shared drives, and ticketing systems, making answers slow and unreliable.",
    solution: "We centralize approved knowledge into a permission-aware assistant that gives employees instant answers with citations and retrieval-backed confidence.",
    impact: "Cut search time, reduce inconsistency, and improve employee effectiveness across the business.",
    image: "https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1400",
  },
  {
    id: "document-intelligence-contract-review",
    title: "Document Intelligence & Contract Review",
    problem: "Legal and operations teams spend too much time manually reviewing long contracts, forms, and policy documents.",
    solution: "We build AI-assisted review systems that extract key fields, compare clauses, identify risk, and summarize obligations for faster human review.",
    impact: "Accelerate document turnaround, improve consistency, and reduce compliance risk across document-heavy workflows.",
    image: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1400",
  },
  {
    id: "computer-vision-quality-inspection",
    title: "Computer Vision Quality Inspection",
    problem: "Manual inspection introduces variability and cannot scale efficiently in production, packaging, or logistics operations.",
    solution: "We create vision systems that detect defects, validate standards, and trigger alerts or downstream workflows in real time.",
    impact: "Improve quality control, reduce defect leakage, and build more reliable inspection processes at scale.",
    image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1400",
  },
  {
    id: "predictive-maintenance-intelligence",
    title: "Predictive Maintenance Intelligence",
    problem: "Equipment failures and reactive maintenance create downtime, inefficiency, and unnecessary service costs.",
    solution: "We combine telemetry, anomaly detection, and maintenance history to identify risk early and recommend preventive actions before failure occurs.",
    impact: "Reduce downtime, extend asset life, and improve maintenance planning across industrial and field operations.",
    image: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1400",
  },
  {
    id: "revenue-forecasting-decision-hub",
    title: "Revenue Forecasting & Decision Hub",
    problem: "Executive teams often make growth decisions using fragmented spreadsheets, delayed reporting, and disconnected metrics.",
    solution: "We build forecasting and decision hubs that combine analytics, scenario planning, and AI-generated summaries to support clearer commercial decisions.",
    impact: "Improve planning quality, accelerate decision-making, and give leadership better visibility into revenue drivers.",
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1400",
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