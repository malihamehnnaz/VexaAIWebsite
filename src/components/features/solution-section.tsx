
import Image from "next/image";
import { cn } from "@/lib/utils";

interface SolutionSectionProps {
  id: string;
  title: string;
  problem: string;
  solution: string;
  impact: string;
  image: string;
  imagePosition?: 'left' | 'right';
}

export default function SolutionSection({ id, title, problem, solution, impact, image, imagePosition = 'left' }: SolutionSectionProps) {
  return (
    <section id={id} className="py-16">
      <div className={cn("container mx-auto px-4 grid md:grid-cols-2 gap-12 items-center", {
        'md:grid-flow-col-dense': imagePosition === 'right',
      })}>
        <div className={cn("order-2 md:order-1", {
          'md:order-2': imagePosition === 'right',
        })}>
          <h2 className="text-3xl font-bold mb-6">{title}</h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold text-primary mb-2">The Problem</h3>
              <p className="text-muted-foreground">{problem}</p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-primary mb-2">Our Solution</h3>
              <p className="text-muted-foreground">{solution}</p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-primary mb-2">The Impact</h3>
              <p className="text-muted-foreground">{impact}</p>
            </div>
          </div>
        </div>
        <div className={cn("order-1 md:order-2", {
          'md:order-1': imagePosition === 'right',
        })}>
          <Image src={image} alt={title} width={600} height={400} className="rounded-lg shadow-lg" />
        </div>
      </div>
    </section>
  );
}