import BlogPostCard from '@/components/features/blog-post-card';

const blogPostsData = [
  {
    slug: "the-rise-of-ai-copilots",
    title: "The Rise of AI Copilots: A New Era of Productivity",
    excerpt: "AI copilots are transforming the way we work. In this article, we explore the benefits of AI copilots and how they can help you and your team become more productive.",
    author: "Alice Johnson",
    date: "2024-10-26",
    image: "/images/blog/ai-copilot-blog.png",
  },
  {
    slug: "demystifying-rag-for-enterprise",
    title: "Demystifying Retrieval-Augmented Generation (RAG) for Enterprise",
    excerpt: "Retrieval-Augmented Generation (RAG) is a powerful technique for building intelligent chatbots and knowledge assistants. Learn how RAG works and how it can be applied in your organization.",
    author: "Charlie Brown",
    date: "2024-10-20",
    image: "/images/blog/rag-blog.png",
  },
  {
    slug: "cloud-migration-strategies",
    title: "Top 5 Cloud Migration Strategies for a Seamless Transition",
    excerpt: "Migrating to the cloud can be a complex process. In this article, we discuss the top 5 cloud migration strategies to help you ensure a smooth and successful transition.",
    author: "Bob Williams",
    date: "2024-10-15",
    image: "/images/blog/cloud-blog.png",
  },
];

export default function BlogPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold text-center mb-12">Blog & Insights</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {blogPostsData.map((post, index) => (
          <BlogPostCard key={index} {...post} />
        ))}
      </div>
    </div>
  );
}