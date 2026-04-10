
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface BlogPostCardProps {
  slug: string;
  title: string;
  excerpt: string;
  author: string;
  date: string;
  category?: string;
  readTime?: string;
  image?: string;
}

export default function BlogPostCard({ slug, title, excerpt, author, date, category, readTime, image }: BlogPostCardProps) {
  const formattedDate = new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Link href={`/blog/${slug}`}>
      <Card className="flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-white/10 bg-gradient-to-br from-background to-muted/30 shadow-lg shadow-primary/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary/10">
        {image ? (
          <CardHeader className="p-0">
            <Image src={image} alt={title} width={400} height={250} className="h-[250px] w-full object-cover" />
          </CardHeader>
        ) : (
          <CardHeader className="relative flex h-[250px] items-end overflow-hidden border-b border-border/60 bg-gradient-to-br from-primary/15 via-cyan-500/10 to-background p-0">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(34,211,238,0.2),_transparent_30%),radial-gradient(circle_at_bottom_left,_rgba(168,85,247,0.18),_transparent_34%)]" />
            <div className="relative w-full p-6">
              <span className="inline-flex rounded-full border border-primary/20 bg-background/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-primary backdrop-blur-sm">
                {category ?? 'Editorial'}
              </span>
              <CardTitle className="mt-4 text-xl leading-tight">{title}</CardTitle>
            </div>
          </CardHeader>
        )}
        <CardContent className="flex-grow p-6">
          <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/90">
            <span>{category ?? 'Editorial'}</span>
            {readTime ? (
              <>
                <span className="h-1 w-1 rounded-full bg-primary/50" />
                <span>{readTime}</span>
              </>
            ) : null}
          </div>
          <CardTitle className="mb-3 mt-4 text-xl leading-tight">{title}</CardTitle>
          <p className="line-clamp-4 text-muted-foreground">{excerpt}</p>
        </CardContent>
        <CardFooter className="flex items-center justify-between border-t border-border/50 p-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8 border border-border/60">
              <AvatarFallback>{author.split(' ').map((part) => part[0]).join('').slice(0, 2)}</AvatarFallback>
            </Avatar>
            <span className="font-medium text-foreground">{author}</span>
          </div>
          <time dateTime={date}>{formattedDate}</time>
        </CardFooter>
      </Card>
    </Link>
  );
}