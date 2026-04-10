
import Image from "next/image";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface BlogPostContentProps {
  title: string;
  content: string;
  author: string;
  date: string;
  image?: string;
}

export default function BlogPostContent({ title, content, author, date, image }: BlogPostContentProps) {
  const formattedDate = new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <article className="container mx-auto max-w-5xl px-4 py-14 md:py-16">
      <Link href="/blog" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
        <ArrowLeft className="h-4 w-4" />
        Back to insights
      </Link>

      <header className="mt-8 rounded-[2rem] border border-white/10 bg-gradient-to-br from-background to-muted/30 p-8 shadow-xl shadow-primary/5 md:p-10">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-4xl font-bold tracking-tight leading-tight md:text-6xl">{title}</h1>
          <div className="mt-6 flex flex-wrap items-center gap-4 text-muted-foreground">
            <div className="flex items-center gap-3">
              <Avatar className="h-11 w-11 border border-border/60">
                <AvatarFallback>{author.split(' ').map((part) => part[0]).join('').slice(0, 2)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-foreground">{author}</p>
                <p className="text-sm">Editorial</p>
              </div>
            </div>
            <span className="hidden h-1 w-1 rounded-full bg-border md:block" />
            <time className="text-sm" dateTime={date}>{formattedDate}</time>
          </div>
        </div>
      </header>
      
      {image ? (
        <div className="mt-8 overflow-hidden rounded-[2rem] border border-white/10 shadow-2xl shadow-primary/5">
          <Image src={image} alt={title} width={1200} height={600} className="h-auto w-full object-cover" />
        </div>
      ) : null}

      <div
        className="prose prose-lg mt-10 max-w-none dark:prose-invert prose-headings:font-headline prose-headings:tracking-tight prose-p:text-foreground/80 prose-p:leading-8 prose-li:text-foreground/80 prose-strong:text-foreground"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </article>
  );
}