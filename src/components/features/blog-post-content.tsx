
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface BlogPostContentProps {
  title: string;
  content: string;
  author: string;
  date: string;
  image: string;
}

export default function BlogPostContent({ title, content, author, date, image }: BlogPostContentProps) {
  return (
    <article className="container mx-auto px-4 py-16 max-w-4xl">
      <header className="mb-8">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tighter leading-tight mb-4">{title}</h1>
        <div className="flex items-center text-muted-foreground">
          <div className="flex items-center gap-2">
            <Avatar className="w-10 h-10">
              <AvatarImage src={`/images/avatars/${author.toLowerCase().replace(' ', '-')}.png`} alt={author} />
              <AvatarFallback>{author.charAt(0)}</AvatarFallback>
            </Avatar>
            <span>By {author}</span>
          </div>
          <span className="mx-2">|</span>
          <time dateTime={date}>{new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</time>
        </div>
      </header>
      
      <Image src={image} alt={title} width={1200} height={600} className="rounded-lg mb-8" />

      <div
        className="prose dark:prose-invert max-w-none"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </article>
  );
}