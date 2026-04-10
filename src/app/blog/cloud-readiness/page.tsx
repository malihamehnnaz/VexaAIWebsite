
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

const heroImage = PlaceHolderImages.find(p => p.id === 'blog-post-3');
const inlineImage1 = PlaceHolderImages.find(p => p.id === 'cloud-inline-1');
const inlineImage2 = PlaceHolderImages.find(p => p.id === 'cloud-inline-2');

export default function BlogPostPage() {
  return (
    <article className="w-full">
      <header className="relative h-[60vh] min-h-[400px] w-full flex items-end justify-center text-center text-white">
        {heroImage && heroImage.imageUrl && (
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
                <Badge variant="secondary">Cloud Services</Badge>
                <Badge variant="secondary">Business Strategy</Badge>
            </div>
            <h1 className="font-headline text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl">
              Is Your Business Ready for the Cloud?
            </h1>
            <div className="flex items-center gap-4 pt-4">
                <Avatar>
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
            The cloud is no longer a futuristic concept; it's the bedrock of modern business operations. Migrating to the cloud offers unparalleled advantages in scalability, cost-efficiency, and innovation. But is your business truly prepared to make the leap?
          </p>
          <p>
            A successful cloud migration is more than just a technical shift. It requires careful planning, a clear strategy, and a deep understanding of your business needs. At VexaAI, we guide businesses through this transformative journey to ensure a seamless and successful transition.
          </p>

          {inlineImage1 && inlineImage1.imageUrl && (
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
          
          <h2>Key Benefits of Cloud Migration</h2>
          <p>
            Moving to the cloud can unlock significant benefits. It allows you to pay only for the resources you use, reducing hefty capital expenditures on physical hardware. The cloud's inherent scalability means your infrastructure can grow with your business, effortlessly handling peaks in demand. Furthermore, it enhances collaboration and provides robust disaster recovery options, safeguarding your business continuity.
          </p>
          
          <h2>Developing a Cloud Strategy</h2>
          <p>
            Before migrating, it's crucial to assess your current IT landscape and define clear objectives. What are you trying to achieve? Lower costs? Greater agility? Better performance? Your strategy should outline which applications to move, the right cloud model to adopt (IaaS, PaaS, SaaS), and whether a public, private, or hybrid cloud is the best fit for your security and compliance needs.
          </p>
          <ul>
            <li><strong>Assess Your Workloads:</strong> Not all applications are cloud-ready. Identify which systems will benefit most from migration and which may need to be modernized or retired.</li>
            <li><strong>Choose the Right Provider:</strong> AWS, Google Cloud, and Azure each have unique strengths. Your choice should align with your technical requirements and budget.</li>
            <li><strong>Plan for Security:</strong> Cloud security is a shared responsibility. Implement robust access controls, encryption, and monitoring to protect your data.</li>
          </ul>

          {inlineImage2 && inlineImage2.imageUrl && (
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

          <h2>The VexaAI Cloud Journey</h2>
          <p>
            At VexaAI, we simplify the complexities of cloud migration. Our experts work with you to create a tailored roadmap, from initial assessment to post-migration optimization. We ensure your cloud environment is secure, cost-effective, and perfectly aligned with your business goals.
          </p>
          <p>
            Making the move to the cloud is a critical step towards future-proofing your business. With the right partner and a solid strategy, you can unlock a new era of agility and innovation.
          </p>
        </div>
      </div>
    </article>
  );
}
