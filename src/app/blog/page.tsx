"use client";

import BlogPostCard from '@/components/features/blog-post-card';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { useLanguage } from '@/components/common/language-provider';
import { getLocale, siteCopy } from '@/lib/localization';

const formatDate = (date: string, locale: string) =>
  new Date(date).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

export default function BlogPage() {
  const { language } = useLanguage();
  const copy = siteCopy[language].blog;
  const locale = getLocale(language);
  const blogPostsData = language === 'sv'
    ? [
        {
          slug: 'the-rise-of-ai-copilots',
          title: 'AI-copiloters framvaxt: en ny era av produktivitet',
          excerpt: 'AI-copiloter forandrar hur vi arbetar. I den har artikeln utforskar vi fordelarna med AI-copiloter och hur de kan hjalpa er att bli mer produktiva.',
          author: 'Alice Johnson',
          date: '2024-10-26',
          category: 'AI-strategi',
          readTime: '6 min lasning',
          image: 'https://images.unsplash.com/photo-1697577418970-95d99b5a55cf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1200',
        },
        {
          slug: 'demystifying-rag-for-enterprise',
          title: 'Att avmystifiera Retrieval-Augmented Generation (RAG) for foretag',
          excerpt: 'RAG ar en kraftfull teknik for intelligenta chatbots och kunskapsassistenter. Lar dig hur det fungerar och hur det kan anvandas i din organisation.',
          author: 'Charlie Brown',
          date: '2024-10-20',
          category: 'Kunskapssystem',
          readTime: '7 min lasning',
        },
        {
          slug: 'cloud-migration-strategies',
          title: 'Topp 5 strategier for en smidig molnmigrering',
          excerpt: 'Molnmigrering kan vara komplext. I den har artikeln gar vi igenom fem strategier som hjalper er till en smidig overgang.',
          author: 'Bob Williams',
          date: '2024-10-15',
          category: 'Molntransformation',
          readTime: '5 min lasning',
          image: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1200',
        },
      ]
    : [
        {
          slug: 'the-rise-of-ai-copilots',
          title: 'The Rise of AI Copilots: A New Era of Productivity',
          excerpt: 'AI copilots are transforming the way we work. In this article, we explore the benefits of AI copilots and how they can help you and your team become more productive.',
          author: 'Alice Johnson',
          date: '2024-10-26',
          category: 'AI Strategy',
          readTime: '6 min read',
          image: 'https://images.unsplash.com/photo-1697577418970-95d99b5a55cf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1200',
        },
        {
          slug: 'demystifying-rag-for-enterprise',
          title: 'Demystifying Retrieval-Augmented Generation (RAG) for Enterprise',
          excerpt: 'Retrieval-Augmented Generation (RAG) is a powerful technique for building intelligent chatbots and knowledge assistants. Learn how RAG works and how it can be applied in your organization.',
          author: 'Charlie Brown',
          date: '2024-10-20',
          category: 'Knowledge Systems',
          readTime: '7 min read',
        },
        {
          slug: 'cloud-migration-strategies',
          title: 'Top 5 Cloud Migration Strategies for a Seamless Transition',
          excerpt: 'Migrating to the cloud can be a complex process. In this article, we discuss the top 5 cloud migration strategies to help you ensure a smooth and successful transition.',
          author: 'Bob Williams',
          date: '2024-10-15',
          category: 'Cloud Transformation',
          readTime: '5 min read',
          image: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1200',
        },
      ];

  const [featuredPost, ...otherPosts] = blogPostsData;

  return (
    <div className="container mx-auto max-w-7xl px-4 py-14 md:py-16">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">{copy.eyebrow}</p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight md:text-6xl">{copy.title}</h1>
        <p className="mt-5 text-base leading-7 text-muted-foreground md:text-lg">
          {copy.description}
        </p>
      </div>

      <div className="mt-12 space-y-8">
        <Link
          href={`/blog/${featuredPost.slug}`}
          className="group block overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-background to-muted/30 shadow-xl shadow-primary/5"
        >
          <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
            <div className="flex flex-col justify-center p-8 md:p-10 lg:p-12">
              <div>
                <div className="flex flex-wrap items-center gap-3 text-xs font-medium uppercase tracking-[0.24em] text-primary">
                  <span>{featuredPost.category}</span>
                  <span className="h-1 w-1 rounded-full bg-primary/50" />
                  <span>{featuredPost.readTime}</span>
                </div>
                <h2 className="mt-5 max-w-2xl text-3xl font-semibold leading-tight text-foreground md:text-5xl">
                  {featuredPost.title}
                </h2>
                <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
                  {featuredPost.excerpt}
                </p>
              </div>

              <div className="mt-8 flex items-center justify-between gap-4 border-t border-border/50 pt-6 text-sm text-muted-foreground">
                <div>
                  <p className="font-medium text-foreground">{featuredPost.author}</p>
                  <p>{formatDate(featuredPost.date, locale)}</p>
                </div>
                <span className="inline-flex items-center gap-2 font-medium text-primary transition-transform group-hover:translate-x-1">
                  {copy.readArticle} <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </div>

            <div className="relative min-h-[320px] lg:min-h-[420px]">
              {featuredPost.image ? (
                <Image
                  src={featuredPost.image}
                  alt={featuredPost.title}
                  fill
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
              ) : null}
            </div>
          </div>
        </Link>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {otherPosts.map((post, index) => (
            <BlogPostCard key={index} {...post} />
          ))}
        </div>
      </div>
    </div>
  );
}