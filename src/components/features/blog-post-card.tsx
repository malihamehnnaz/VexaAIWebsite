
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface BlogPostCardProps {
  slug: string;
  title: string;
  excerpt: string;
  author: string;
  date: string;
  image: string;
}

export default function BlogPostCard({ slug, title, excerpt, author, date, image }: BlogPostCardProps) {
  return (
    <Link href={`/blog/${slug}`}>
      <Card className="flex flex-col h-full overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
        <CardHeader className="p-0">
          <Image src={image} alt={title} width={400} height={250} className="object-cover" />
        </CardHeader>
        <CardContent className="flex-grow p-6">
          <CardTitle className="text-xl mb-2">{title}</CardTitle>
          <p className="text-muted-foreground">{excerpt}</p>
        </CardContent>
        <CardFooter className="p-6 pt-0 flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Avatar className="w-8 h-8">
              <AvatarImage src={`/images/avatars/${author.toLowerCase().replace(' ', '-')}.png`} alt={author} />
              <AvatarFallback>{author.charAt(0)}</AvatarFallback>
            </Avatar>
            <span>{author}</span>
          </div>
          <time dateTime={date}>{new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</time>
        </CardFooter>
      </Card>
    </Link>
  );
}