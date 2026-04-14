
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

interface CaseStudyCardProps {
  id: string;
  title: string;
  problem: string;
  solution: string;
  techStack: string[];
  results: string;
  image: string;
}

export default function CaseStudyCard({ id, title, problem, solution, techStack, results, image }: CaseStudyCardProps) {
  return (
    <Card id={id} className="overflow-hidden shadow-lg">
      <div className="grid md:grid-cols-2">
        <div className="p-8">
          <h2 className="text-3xl font-bold mb-4">{title}</h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold text-primary mb-2">Problem</h3>
              <p className="text-muted-foreground">{problem}</p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-primary mb-2">Solution</h3>
              <p className="text-muted-foreground">{solution}</p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-primary mb-2">Results</h3>
              <p className="text-muted-foreground font-bold">{results}</p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-primary mb-2">Tech Stack</h3>
              <div className="flex flex-wrap gap-2">
                {techStack.map((tech, index) => (
                  <Badge key={index} variant="secondary">{tech}</Badge>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div>
          <Image src={image} alt={title} width={800} height={600} className="object-cover h-full" />
        </div>
      </div>
    </Card>
  );
}