import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

const heroImage = PlaceHolderImages.find(p => p.id === 'blog-post-1');
const inlineImage1 = PlaceHolderImages.find(p => p.id === 'blog-inline-1');
const inlineImage2 = PlaceHolderImages.find(p => p.id === 'blog-inline-2');


export default function BlogPostPage() {
  return (
    <article className="w-full">
      <header className="relative h-[60vh] min-h-[400px] w-full flex items-end justify-center text-center text-white">
        {heroImage && (
          <Image
            src={heroImage.imageUrl}
            alt={heroImage.description}
            fill
            className="object-cover"
            priority
            data-ai-hint={heroImage.imageHint}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent" />
        <div className="relative z-10 container px-4 md:px-6 pb-12">
          <div className="flex flex-col items-center space-y-4">
            <div className="flex gap-2">
                <Badge variant="secondary">Generative AI</Badge>
                <Badge variant="secondary">Business Strategy</Badge>
            </div>
            <h1 className="font-headline text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl">
              The Future of Business is Here, and It's Powered by Generative AI
            </h1>
            <div className="flex items-center gap-4 pt-4">
                <Avatar>
                    <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
                    <AvatarFallback>VAI</AvatarFallback>
                </Avatar>
                <div>
                    <p className="font-semibold">By The VexaAI Team</p>
                    <p className="text-sm text-gray-300">Published on {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto max-w-4xl py-16 md:py-24 px-4 md:px-6">
        <div className="prose prose-lg dark:prose-invert mx-auto">
          <p className="lead">
            Imagine a world where your business doesn't just respond to customer needs but anticipates them. A world where content creation isn't a bottleneck but a seamless, automated flow of creativity. This isn't science fiction; it's the reality being shaped by Generative AI.
          </p>
          <p>
            Generative AI is more than just a buzzword; it's a revolutionary force that is fundamentally rewriting the rules of business. From startups to global enterprises, companies are harnessing its power to unlock unprecedented levels of efficiency, personalization, and innovation. At VexaAI, we're at the forefront of this transformation, and we're here to show you what's possible.
          </p>

          {inlineImage1 && (
            <div className="my-8 rounded-lg overflow-hidden shadow-xl">
                 <Image
                    src={inlineImage1.imageUrl}
                    alt={inlineImage1.description}
                    width={1200}
                    height={800}
                    className="aspect-[3/2] object-cover"
                    data-ai-hint={inlineImage1.imageHint}
                />
            </div>
           
          )}
          
          <h2>Hyper-Personalization at Scale</h2>
          <p>
            For years, personalization has been the holy grail of marketing. Generative AI makes it a reality. Imagine creating millions of unique marketing messages, product recommendations, and user experiences, each tailored to an individual's preferences and behavior. This isn't just about inserting a name into an email; it's about crafting a unique journey for every single customer, boosting engagement and loyalty to new heights.
          </p>
          
          <h2>Automating the Creative Process</h2>
          <p>
            Content is king, but its creation can be a major resource drain. Generative AI is changing the game by automating the creation of everything from blog posts and social media updates to product descriptions and ad copy. But it doesn't stop at text. AI can now generate stunning images, professional-quality video, and even original music, freeing up your creative teams to focus on strategy and high-level concepts.
          </p>

          {inlineImage2 && (
             <div className="my-8 rounded-lg overflow-hidden shadow-xl">
                <Image
                    src={inlineImage2.imageUrl}
                    alt={inlineImage2.description}
                    width={1200}
                    height={800}
                    className="aspect-[3/2] object-cover"
                    data-ai-hint={inlineImage2.imageHint}
                />
            </div>
          )}

          <h2>Smarter Products, Smarter Decisions</h2>
          <p>
            Generative AI is not just for marketing and content. It can be embedded directly into your products, creating intelligent applications that learn and adapt. Think of software that writes its own code to fix bugs, or analytics tools that don't just present data but also generate natural-language insights and recommend actions. By integrating AI at the core of your operations, you can drive efficiency and make smarter, data-driven decisions across the board.
          </p>
          
          <h2>The VexaAI Advantage</h2>
          <p>
            The future of business is intelligent, automated, and highly personalized. Generative AI is the engine driving this change, and the companies that embrace it today will be the leaders of tomorrow. Are you ready to join the revolution?
          </p>
          <p>
            At VexaAI, we provide the expertise and tools to help you integrate Generative AI into your business. Whether it's building a custom chatbot, deploying a content generation engine, or developing a full-fledged AI-powered application, we have the solutions to help you thrive in this new era.
          </p>
        </div>
      </div>
    </article>
  );
}
