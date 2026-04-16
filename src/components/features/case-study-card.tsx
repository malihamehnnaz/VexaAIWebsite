
"use client";

import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useLanguage } from '@/components/common/language-provider';
import { siteCopy } from '@/lib/localization';

interface CaseStudyCardProps {
  id: string;
  title: string;
  sector: string;
  problem: string;
  solution: string;
  techStack: string[];
  metrics: { label: string; value: string }[];
  image: string;
}

export default function CaseStudyCard({ id, title, sector, problem, solution, techStack, metrics, image }: CaseStudyCardProps) {
  const { language } = useLanguage();
  const copy = siteCopy[language].caseStudiesPage;

  return (
    <Card id={id} className="overflow-hidden shadow-lg">
      <div className="grid md:grid-cols-2">
        <div className="p-8">
          <h2 className="text-3xl font-bold mb-4">{title}</h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold text-primary mb-2">{copy.sector}</h3>
              <p className="text-muted-foreground">{sector}</p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-primary mb-2">{copy.problem}</h3>
              <p className="text-muted-foreground">{problem}</p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-primary mb-2">{copy.solution}</h3>
              <p className="text-muted-foreground">{solution}</p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-primary mb-2">{copy.keyMetrics}</h3>
              <div className="space-y-2 text-muted-foreground">
                {metrics.map((metric) => (
                  <p key={metric.label} className="flex items-center justify-between gap-4 rounded-lg border border-border/50 px-3 py-2">
                    <span>{metric.label}</span>
                    <span className="font-semibold text-foreground">{metric.value}</span>
                  </p>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-primary mb-2">{copy.techStack}</h3>
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