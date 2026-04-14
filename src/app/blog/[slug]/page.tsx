import BlogPostContent from '@/components/features/blog-post-content';

// This is mock data. In a real application, you would fetch this from a CMS.
const blogPostsData = [
  {
    slug: "the-rise-of-ai-copilots",
    title: "The Rise of AI Copilots: A New Era of Productivity",
    content: `
      <p>AI copilots are rapidly changing the landscape of modern work. These intelligent assistants, integrated directly into our daily applications, are designed to augment human capabilities, automate repetitive tasks, and provide proactive guidance. In this article, we'll explore the rise of AI copilots, their key benefits, and how they are ushering in a new era of productivity.</p>
      <h2>What is an AI Copilot?</h2>
      <p>An AI copilot is an advanced AI-powered assistant that works alongside users in their software applications. Unlike traditional chatbots or virtual assistants, copilots have a deep understanding of the application's context and the user's intent. They can help with a wide range of tasks, from writing code and drafting emails to analyzing data and generating reports.</p>
      <h2>Key Benefits of AI Copilots</h2>
      <ul>
        <li><strong>Increased Productivity:</strong> By automating repetitive tasks and providing intelligent suggestions, copilots can significantly reduce the time it takes to complete work.</li>
        <li><strong>Improved Quality:</strong> Copilots can help reduce errors by providing real-time feedback and quality checks.</li>
        <li><strong>Enhanced Creativity:</strong> By handling the mundane aspects of a task, copilots free up users to focus on more creative and strategic thinking.</li>
        <li><strong>Faster Onboarding:</strong> Copilots can act as interactive tutors, guiding new users through complex software and processes.</li>
      </ul>
      <h2>The Future is Collaborative</h2>
      <p>The relationship between humans and AI is evolving from one of delegation to one of collaboration. AI copilots are at the forefront of this shift, empowering individuals and teams to achieve more than ever before. As this technology continues to mature, we can expect to see even more innovative applications that will further revolutionize the way we work.</p>
    `,
    author: "Alice Johnson",
    date: "2024-10-26",
    image: "https://images.unsplash.com/photo-1697577418970-95d99b5a55cf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1400",
  },
  {
    slug: "demystifying-rag-for-enterprise",
    title: "Demystifying Retrieval-Augmented Generation (RAG) for Enterprise",
    content: `
      <p>Retrieval-Augmented Generation, or RAG, is one of the most practical ways to make enterprise AI useful. Instead of asking a model to answer from generic training alone, RAG retrieves approved internal knowledge first, then uses that context to produce a grounded response.</p>
      <h2>Why enterprises use RAG</h2>
      <p>Most organizations cannot rely on a model to invent answers about policies, contracts, support procedures, or internal operating rules. They need traceable responses tied to the latest approved documents. RAG solves that by connecting models to curated knowledge sources.</p>
      <ul>
        <li><strong>Higher trust:</strong> responses are grounded in real company content.</li>
        <li><strong>Fewer hallucinations:</strong> the model works from retrieved evidence.</li>
        <li><strong>Better governance:</strong> teams can control what content is indexed and exposed.</li>
      </ul>
      <h2>How it works</h2>
      <p>A typical RAG workflow has four stages. First, documents are collected from trusted systems such as SharePoint, knowledge bases, tickets, or PDFs. Second, those documents are split into chunks and stored in a searchable index. Third, a user query retrieves the most relevant chunks. Finally, the model answers using those retrieved passages as context.</p>
      <h2>What makes a RAG system successful</h2>
      <p>Strong enterprise RAG is not just about vector search. It depends on content quality, permission controls, chunking strategy, metadata, prompt design, and evaluation. The best systems also include citations, escalation paths, and feedback loops so answers improve over time.</p>
      <h2>Common mistakes</h2>
      <p>Teams often fail when they index everything without structure, ignore document freshness, or skip evaluation. Another common problem is treating retrieval quality as secondary. In reality, poor retrieval guarantees poor answers no matter how strong the model is.</p>
      <h2>Where RAG delivers value</h2>
      <p>RAG performs especially well in customer support, internal enablement, policy-heavy operations, compliance workflows, and proposal support. It gives teams fast answers while keeping the response anchored to approved business knowledge.</p>
      <p>For enterprises, RAG is not a trend. It is a practical architecture for turning scattered information into dependable, usable intelligence.</p>
    `,
    author: "Charlie Brown",
    date: "2024-10-20",
  },
  {
    slug: "cloud-migration-strategies",
    title: "Top 5 Cloud Migration Strategies for a Seamless Transition",
    content: `
      <p>Cloud migration succeeds when it is treated as an operating model shift, not just a hosting decision. The strongest programs combine business priorities, architecture readiness, security design, and delivery discipline from the start.</p>
      <h2>1. Start with workload prioritization</h2>
      <p>Not every system should move first. Prioritize workloads based on business criticality, technical complexity, dependency chains, and expected value. This helps teams create a migration roadmap that reduces risk while building momentum early.</p>
      <h2>2. Choose the right migration pattern</h2>
      <p>Some applications are best rehosted quickly, others need replatforming, and some should be refactored for cloud-native scale. Selecting the wrong approach can increase cost and extend timelines.</p>
      <h2>3. Build the landing zone first</h2>
      <p>A modern cloud foundation should include identity, networking, policies, observability, backup, and cost controls before production systems move. A weak landing zone creates operational pain later.</p>
      <h2>4. Automate as you migrate</h2>
      <p>Infrastructure as code, CI/CD, and environment standards should be introduced during migration, not after it. Automation improves repeatability and gives internal teams a cleaner platform to operate.</p>
      <h2>5. Measure business outcomes</h2>
      <p>The goal is not simply to complete cutover. Track deployment speed, service reliability, operating cost, recovery readiness, and developer productivity so the program delivers visible business value.</p>
      <p>The smoothest cloud transitions happen when strategy, engineering, and operations move together. Migration then becomes a platform advantage instead of a one-time project.</p>
    `,
    author: "Bob Williams",
    date: "2024-10-15",
    image: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1400",
  },
];

export async function generateStaticParams() {
  return blogPostsData.map((post) => ({
    slug: post.slug,
  }));
}

function getPost(slug: string) {
  return blogPostsData.find((post) => post.slug === slug);
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPost(slug);

  if (!post) {
    return <div>Post not found</div>;
  }

  return (
    <BlogPostContent {...post} />
  );
}