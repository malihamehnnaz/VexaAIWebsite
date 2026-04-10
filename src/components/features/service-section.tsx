
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ServiceSectionProps {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  benefits: string[];
  technologies: string[];
  useCases: string[];
}

export default function ServiceSection({ id, icon, title, description, benefits, technologies, useCases }: ServiceSectionProps) {
  return (
    <section id={id} className="py-16 bg-secondary/30 dark:bg-secondary/10 rounded-lg">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-3 gap-8 items-center">
          <div className="md:col-span-1 flex flex-col items-center text-center">
            {icon}
            <h2 className="text-2xl font-bold mt-4">{title}</h2>
          </div>
          <div className="md:col-span-2">
            <p className="text-lg text-muted-foreground mb-8">{description}</p>
            
            <div className="grid sm:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-semibold mb-4">Key Benefits</h3>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  {benefits.map((benefit, index) => (
                    <li key={index}>{benefit}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-4">Example Use Cases</h3>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  {useCases.map((useCase, index) => (
                    <li key={index}>{useCase}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-8">
              <h3 className="text-xl font-semibold mb-4">Technologies We Use</h3>
              <div className="flex flex-wrap gap-2">
                {technologies.map((tech, index) => (
                  <Badge key={index} variant="secondary">{tech}</Badge>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}