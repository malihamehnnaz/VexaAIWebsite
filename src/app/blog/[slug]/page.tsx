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
    image: "/images/blog/ai-copilot-blog.png",
  },
  {
    slug: "demystifying-rag-for-enterprise",
    title: "Demystifying Retrieval-Augmented Generation (RAG) for Enterprise",
    content: "<p>Content for RAG blog post...</p>",
    author: "Charlie Brown",
    date: "2024-10-20",
    image: "/images/blog/rag-blog.png",
  },
  {
    slug: "cloud-migration-strategies",
    title: "Top 5 Cloud Migration Strategies for a Seamless Transition",
    content: "<p>Content for cloud migration blog post...</p>",
    author: "Bob Williams",
    date: "2024-10-15",
    image: "/images/blog/cloud-blog.png",
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

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = getPost(params.slug);

  if (!post) {
    return <div>Post not found</div>;
  }

  return (
    <BlogPostContent {...post} />
  );
}