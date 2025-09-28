import { BrainCircuit, CodeXml, Cloud, Bot, GitBranch, DatabaseZap } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const serviceCategories = [
  {
    category: 'Artificial Intelligence',
    icon: BrainCircuit,
    services: [
      {
        title: 'AI Consulting',
        icon: Bot,
        description: 'Initial consultation and strategy development for AI adoption, helping you find the best opportunities for AI in your business.',
      },
      {
        title: 'Custom AI Model Development',
        icon: BrainCircuit,
        description: 'Building tailored AI and machine learning models to address your specific business challenges and unlock unique insights.',
      },
      {
        title: 'AI Integration',
        icon: GitBranch,
        description: 'Seamlessly integrating powerful AI solutions into your existing systems and workflows to enhance capabilities without disruption.',
      },
    ],
  },
  {
    category: 'Software & Cloud',
    icon: CodeXml,
    services: [
      {
        title: 'Custom Software Development',
        icon: CodeXml,
        description: 'Designing and building bespoke software solutions, from web applications to enterprise systems, tailored to your needs.',
      },
      {
        title: 'Cloud Migration & Management',
        icon: Cloud,
        description: 'Migrating your infrastructure to the cloud and providing ongoing management for scalability, security, and efficiency.',
      },
      {
        title: 'DevOps & Automation',
        icon: DatabaseZap,
        description: 'Implementing DevOps practices and automation to streamline your software delivery pipeline, increasing speed and reliability.',
      },
    ],
  },
];

export default function ServicesSection() {
  return (
    <section id="services" className="w-full py-16 md:py-24 lg:py-32 bg-secondary">
      <div className="container mx-auto max-w-7xl px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="space-y-2">
            <h2 className="font-headline text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-primary">
              Our Services
            </h2>
            <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
              We provide a comprehensive suite of services to transform your business with cutting-edge technology.
            </p>
          </div>
        </div>
        <div className="mt-12 space-y-16">
          {serviceCategories.map((category) => (
            <div key={category.category}>
              <div className="flex items-center justify-center mb-8">
                 <h3 className="font-headline text-2xl font-semibold tracking-tight flex items-center gap-3">
                    <category.icon className="h-8 w-8 text-accent" />
                    {category.category}
                </h3>
              </div>
              <div className="mx-auto grid items-start gap-8 sm:max-w-4xl sm:grid-cols-1 md:gap-12 lg:max-w-5xl lg:grid-cols-3">
                {category.services.map((service) => (
                  <Card key={service.title} className="shadow-md hover:shadow-xl transition-shadow duration-300">
                    <CardHeader className="flex flex-row items-center gap-4">
                      <div className="bg-primary/10 p-3 rounded-full">
                         <service.icon className="h-6 w-6 text-primary" />
                      </div>
                      <CardTitle className="font-headline text-lg">{service.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription>{service.description}</CardDescription>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
